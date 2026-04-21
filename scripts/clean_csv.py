"""
Limpa o CSV "Fazenda.xlsx - Evolução Gado.csv" e gera dois arquivos prontos
para importar no Supabase:

  output/animais.csv   — um registro por animal
  output/pesagens.csv  — um registro por pesagem (normalizado)

Como usar:
  python3 scripts/clean_csv.py
"""

import csv
import uuid
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from br_parse import parse_br_number, parse_date, safe_get, write_csv

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

INPUT_FILE = "Fazenda.xlsx - Evolução Gado.csv"
OUTPUT_DIR = "output"

MONTHS_PT = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
    "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}

# (numero_pesagem, idx_data, idx_kg, idx_arroba)
# None em idx_arroba = pesagens 7-9 que não têm arroba na planilha
PESAGEM_COLS = [
    (1,  5,  6,  7),
    (2,  8,  9, 10),
    (3, 16, 17, 18),
    (4, 24, 25, 26),
    (5, 32, 33, 34),
    (6, 40, 41, 42),
    (7, 48, 49, None),
    (8, 50, 51, None),
    (9, 52, 53, None),
]

# ---------------------------------------------------------------------------
# Funções de limpeza
# ---------------------------------------------------------------------------

def parse_status(s):
    """
    'Vivo'      → ('vivo', None)
    'Morreu'    → ('morreu', None)
    'agosto 22' → ('vendido', '2022-08-01')
    """
    if not s:
        return "vivo", None
    s = s.strip()
    lower = s.lower()
    if lower == "vivo":
        return "vivo", None
    if lower == "morreu":
        return "morreu", None
    parts = lower.split()
    if len(parts) == 2 and parts[0] in MONTHS_PT:
        month = MONTHS_PT[parts[0]]
        year = int(parts[1])
        if year < 100:
            year += 2000
        return "vendido", f"{year}-{month:02d}-01"
    # fallback — trata qualquer valor não reconhecido como vendido sem data
    return "vendido", None


# ---------------------------------------------------------------------------
# Leitura e limpeza
# ---------------------------------------------------------------------------

def load_and_clean(filepath):
    animais = []
    pesagens = []

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Linha 0 = header de grupo (Compra, 1a Pesagem...) — ignorar
    # Linha 1 = header real — ignorar (usamos índices fixos)
    # Dados começam na linha 2

    # A planilha tem blocos onde a numeração reinicia em 1 (lotes novos).
    # Para manter numero_boi único, aplicamos um offset acumulado a cada reset.
    prev_raw = 0
    offset = 0

    for row in rows[2:]:
        # Ignora linhas completamente vazias
        if not any(c.strip() for c in row):
            continue

        boi_raw = safe_get(row, 0)
        # Ignora linhas sem número de boi
        if not boi_raw:
            continue
        try:
            raw_numero = int(boi_raw)
        except ValueError:
            continue

        if raw_numero < prev_raw:
            offset += prev_raw
        prev_raw = raw_numero
        numero_boi = raw_numero + offset

        status_raw = safe_get(row, 1) or ""
        vendedor    = safe_get(row, 2) or ""
        data_compra = parse_date(safe_get(row, 3))
        valor_compra = parse_br_number(safe_get(row, 4))

        status, data_venda = parse_status(status_raw)

        animal_id = str(uuid.uuid4())

        animais.append({
            "id":           animal_id,
            "numero_boi":   numero_boi,
            "vendedor":     vendedor,
            "data_compra":  data_compra or "",
            "valor_compra": valor_compra if valor_compra is not None else "",
            "status":       status,
            "data_venda":   data_venda or "",
        })

        for numero, idx_data, idx_kg, idx_arroba in PESAGEM_COLS:
            data = parse_date(safe_get(row, idx_data))
            kg   = parse_br_number(safe_get(row, idx_kg))
            arroba = parse_br_number(safe_get(row, idx_arroba)) if idx_arroba else None

            # Só registra pesagem se tiver pelo menos data ou kg
            if data is None and kg is None:
                continue

            pesagens.append({
                "id":           str(uuid.uuid4()),
                "animal_id":    animal_id,
                "numero":       numero,
                "data":         data or "",
                "peso_kg":      kg if kg is not None else "",
                "peso_arroba":  arroba if arroba is not None else "",
            })

    return animais, pesagens


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir   = os.path.dirname(script_dir)

    input_path   = os.path.join(root_dir, INPUT_FILE)
    output_dir   = os.path.join(root_dir, OUTPUT_DIR)

    print(f"Lendo {input_path}...")
    animais, pesagens = load_and_clean(input_path)

    write_csv(
        os.path.join(output_dir, "animais.csv"),
        animais,
        ["id", "numero_boi", "vendedor", "data_compra", "valor_compra", "status", "data_venda"],
    )
    write_csv(
        os.path.join(output_dir, "pesagens.csv"),
        pesagens,
        ["id", "animal_id", "numero", "data", "peso_kg", "peso_arroba"],
    )

    print("\nPronto! Importe no Supabase nessa ordem:")
    print("  1. output/animais.csv   → tabela animais")
    print("  2. output/pesagens.csv  → tabela pesagens")
