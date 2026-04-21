"""
Processa todos os extratos bancários em fluxo-de-caixa/**/*.xlsx e gera:

  output/transacoes_bancarias.csv   — uma linha por transação real
  output/saldos_diarios.csv         — saldo de abertura e fechamentos diários

Reconciliação obrigatória: saldo_anterior + Σ transações == saldo_do_dia para
cada dia do mês. Se qualquer mês não bater, o script aborta e não gera CSVs.

Como usar:
  python3 scripts/clean_fluxo_caixa.py
"""

import hashlib
import os
import re
import sys
import uuid
from pathlib import Path

import openpyxl

sys.path.insert(0, os.path.dirname(__file__))
from br_parse import parse_br_number, parse_date, safe_get, normalize_whitespace, write_csv

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = ROOT_DIR / "fluxo-de-caixa"
OUTPUT_DIR = ROOT_DIR / "output"
SHEET_NAME = "Extrato Conta"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def mes_referencia_from_filename(filename):
    """'Extrato conta corrente - 072022.xlsx' → '2022-07-01'"""
    m = re.search(r"(\d{2})(\d{4})\.xlsx$", filename, re.IGNORECASE)
    if not m:
        raise ValueError(f"Não consegui extrair mês/ano de: {filename}")
    mes, ano = m.group(1), m.group(2)
    return f"{ano}-{mes}-01"


def compute_row_hash(mes_referencia, data, lancamento, detalhes, n_documento, valor):
    parts = [
        normalize_whitespace(mes_referencia),
        normalize_whitespace(data or ""),
        normalize_whitespace(lancamento or ""),
        normalize_whitespace(detalhes or ""),
        normalize_whitespace(n_documento or ""),
        f"{valor:.2f}" if valor is not None else "",
    ]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def classify_row(row):
    """Retorna 'saldo_anterior' | 'saldo_dia' | 'transacao' | None."""
    lancamento = safe_get(row, 1) or ""
    data_raw = safe_get(row, 0) or ""
    tipo_raw = safe_get(row, 5) or ""

    if lancamento == "Saldo Anterior":
        return "saldo_anterior"
    if data_raw == "00/00/0000":
        return "saldo_dia"
    if tipo_raw in ("Entrada", "Saída"):
        return "transacao"
    return None


# ---------------------------------------------------------------------------
# Processamento de arquivo
# ---------------------------------------------------------------------------

def process_file(xlsx_path):
    """
    Retorna (transacoes, saldos, events) onde events é a sequência ordenada
    usada pela reconciliação: ('saldo_anterior'|'tx'|'saldo_dia', date_str, valor).
    """
    filename = Path(xlsx_path).name
    mes_ref = mes_referencia_from_filename(filename)

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb[SHEET_NAME]
    data_rows = list(ws.iter_rows(values_only=True))[1:]  # pula header

    transacoes = []
    saldos = []
    events = []
    current_date = None

    for row in data_rows:
        kind = classify_row(row)
        if kind is None:
            continue

        if kind == "saldo_anterior":
            data_val = parse_date(safe_get(row, 0))
            valor = parse_br_number(safe_get(row, 4))
            events.append(("saldo_anterior", data_val, valor))
            saldos.append({
                "id": str(uuid.uuid4()),
                "mes_referencia": mes_ref,
                "data": data_val or "",
                "tipo_saldo": "anterior",
                "saldo": valor if valor is not None else "",
            })

        elif kind == "saldo_dia":
            valor = parse_br_number(safe_get(row, 4))
            events.append(("saldo_dia", current_date, valor))
            saldos.append({
                "id": str(uuid.uuid4()),
                "mes_referencia": mes_ref,
                "data": current_date or "",
                "tipo_saldo": "diario",
                "saldo": valor if valor is not None else "",
            })

        elif kind == "transacao":
            data_val = parse_date(safe_get(row, 0))
            if data_val:
                current_date = data_val
            lancamento = safe_get(row, 1) or ""
            detalhes = safe_get(row, 2) or ""
            n_doc = safe_get(row, 3) or ""
            valor = parse_br_number(safe_get(row, 4))
            tipo_raw = safe_get(row, 5) or ""
            tipo = "entrada" if tipo_raw == "Entrada" else "saida"

            row_hash = compute_row_hash(mes_ref, data_val, lancamento, detalhes, n_doc, valor)
            events.append(("tx", data_val, valor, tipo))

            transacoes.append({
                "id": str(uuid.uuid4()),
                "row_hash": row_hash,
                "mes_referencia": mes_ref,
                "data": data_val or "",
                "lancamento": lancamento,
                "detalhes": detalhes,
                "n_documento": n_doc,
                "valor": valor if valor is not None else "",
                "tipo": tipo,
                "tipo_raw": tipo_raw,
            })

    return transacoes, saldos, events


# ---------------------------------------------------------------------------
# Reconciliação
# ---------------------------------------------------------------------------

def reconcile(mes_ref, events):
    """
    Percorre os eventos em ordem (mesma sequência do extrato).
    Acumula saldo e confere contra cada saldo_dia.
    Retorna lista de descrições de erro — vazia se tudo ok.
    """
    running = None
    erros = []

    for event in events:
        kind, date_str, valor = event[0], event[1], event[2]
        if valor is None:
            continue
        v = float(valor)

        if kind == "saldo_anterior":
            running = v
        elif kind == "tx":
            tipo = event[3] if len(event) > 3 else None
            # Depósito bloqueado BB: tipo='saida' com valor positivo — não afeta saldo disponível.
            # O banco libera no dia seguinte via 'Desbloqueio de depósito'.
            if tipo == "saida" and v > 0:
                continue
            if running is not None:
                running += v
        elif kind == "saldo_dia":
            if running is None:
                continue
            if abs(running - v) > 0.02:
                erros.append(
                    f"  [{date_str or '?'}] calculado={running:.2f}  extrato={v:.2f}  diff={running - v:+.2f}"
                )

    return erros


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def find_xlsx_files():
    files = sorted(INPUT_DIR.rglob("*.xlsx"))
    if not files:
        print(f"Nenhum .xlsx encontrado em {INPUT_DIR}")
        sys.exit(1)
    return files


def main():
    files = find_xlsx_files()
    print(f"Processando {len(files)} arquivo(s)...\n")

    all_transacoes = []
    all_saldos = []
    erros_reconciliacao = []

    for xlsx_path in files:
        label = f"{xlsx_path.parent.name}/{xlsx_path.name}"
        try:
            transacoes, saldos, events = process_file(xlsx_path)
        except Exception as e:
            print(f"  ✗ {label}: ERRO ao ler arquivo — {e}")
            sys.exit(1)

        erros = reconcile(mes_referencia_from_filename(xlsx_path.name), events)

        if erros:
            print(f"  ✗ {label}: {len(transacoes)} tx, {len(saldos)} saldos — RECONCILIAÇÃO FALHOU")
            erros_reconciliacao.append((label, erros))
        else:
            print(f"  ✓ {label}: {len(transacoes)} tx, {len(saldos)} saldos — OK")
            all_transacoes.extend(transacoes)
            all_saldos.extend(saldos)

    print()

    if erros_reconciliacao:
        print(f"ABORTING — {len(erros_reconciliacao)} mês(es) com erro de reconciliação:\n")
        for label, erros in erros_reconciliacao:
            print(f"{label}:")
            for e in erros:
                print(e)
        print("\nNenhum CSV gerado.")
        sys.exit(1)

    print(f"Total: {len(all_transacoes)} transações, {len(all_saldos)} saldos\n")

    output_dir = str(OUTPUT_DIR)
    write_csv(
        os.path.join(output_dir, "transacoes_bancarias.csv"),
        all_transacoes,
        ["id", "row_hash", "mes_referencia", "data", "lancamento", "detalhes",
         "n_documento", "valor", "tipo", "tipo_raw"],
    )
    write_csv(
        os.path.join(output_dir, "saldos_diarios.csv"),
        all_saldos,
        ["id", "mes_referencia", "data", "tipo_saldo", "saldo"],
    )

    print("\nPronto! Importe no Supabase nessa ordem:")
    print("  1. Rode sql/fluxo_caixa_schema.sql no SQL Editor")
    print("  2. output/transacoes_bancarias.csv → tabela transacoes_bancarias")
    print("  3. output/saldos_diarios.csv       → tabela saldos_diarios")


if __name__ == "__main__":
    main()
