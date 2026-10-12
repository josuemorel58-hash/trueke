"""Regenera la copia incluida de los precios abiertos publicados por Pro Consumidor."""

import argparse
import csv
import io
import json
import re
from pathlib import Path
from urllib.request import urlopen

SOURCE = 'https://www.proconsumidor.gob.do/files/precios%20de%20productos%20de%20primera%20necesidad.csv'
TARGET = Path(__file__).resolve().parents[1] / 'src/data/precios-abiertos.json'


def parse_csv(content: str):
    lines = list(csv.reader(io.StringIO(content.lstrip('\ufeff')), delimiter=';'))
    title = lines[0][0].strip()
    year_match = re.search(r'\b20\d{2}\b', title)
    if not year_match:
        raise ValueError('La fuente no identifica el año del período.')
    year = int(year_match.group())
    if [column.strip().lower() for column in lines[2][:7]] != [
        'id', 'producto', 'tipo', 'precio', 'mes', 'año', 'establecimiento'
    ]:
        raise ValueError('Cambió el formato del CSV; revisar columnas antes de publicar.')

    rows = []
    for entry in lines[3:]:
        if len(entry) < 7 or not entry[0].strip().isdigit():
            continue
        identifier, name, presentation, amount, month, item_year, establishment = [
            value.strip() for value in entry[:7]
        ]
        if not name or not presentation or not establishment or not item_year.isdigit() or int(item_year) != year:
            continue  # El archivo de 2026 contiene una fila con el año erróneo 2035.
        try:
            price = float(amount.replace(',', ''))
        except ValueError:
            continue
        if price <= 0 or price >= 1000000:
            continue
        rows.append({
            'id': identifier,
            'producto': ' '.join(name.split()),
            'tipo': ' '.join(presentation.split()),
            'precio': round(price, 2),
            'mes': month,
            'anio': year,
            'establecimiento': ' '.join(establishment.split()),
        })
    if len(rows) < 50:
        raise ValueError('Hay muy pocos precios válidos; no reemplazar la copia anterior.')
    return {'fuente': SOURCE, 'periodo': title, 'registros': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', type=Path, help='Archivo CSV ya descargado, para generar sin red')
    args = parser.parse_args()
    content = args.csv.read_text(encoding='utf-8-sig') if args.csv else urlopen(SOURCE, timeout=20).read().decode('utf-8-sig')
    data = parse_csv(content)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f"{len(data['registros'])} precios guardados de {data['periodo']}")


if __name__ == '__main__':
    main()
