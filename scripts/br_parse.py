"""
Utilitários de parsing para dados em formato pt-BR.
Compartilhado entre clean_csv.py e clean_fluxo_caixa.py.
"""

import csv
import os
import re
from datetime import datetime


def parse_br_number(s):
    """'1.752,63' → 1752.63 | '#REF!' ou vazio → None"""
    if not s:
        return None
    s = str(s).strip().strip('"')
    if s in ("#REF!", "0,0", ""):
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_date(s):
    """'10/04/23' ou '10/04/2023' → '2023-04-10' | '00/00/0000' ou inválido → None"""
    if not s:
        return None
    s = str(s).strip().strip('"')
    if s in ("#REF!", "", "00/00/0000"):
        return None
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def safe_get(row, idx):
    """Retorna None se o índice não existir ou a célula estiver vazia/#REF!."""
    if idx is None or idx >= len(row):
        return None
    val = row[idx]
    if val is None:
        return None
    val = str(val).strip().strip('"')
    if val in ("#REF!", ""):
        return None
    return val


def normalize_whitespace(s):
    """Remove espaços extras — usado para hash determinístico."""
    if not s:
        return ""
    return re.sub(r"\s+", " ", str(s).strip())


def write_csv(filepath, rows, fieldnames):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  → {filepath}  ({len(rows)} registros)")
