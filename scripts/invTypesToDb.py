import csv

# Read CSV and prepare rows
with open('data/invTypes.csv', newline='', encoding='utf-8') as csvfile:
    reader = csv.reader(csvfile)
    rows = []
    for row in reader:
        if len(row) >= 3:
            rows.append([row[0], row[2]])

# Write to new CSV
with open('invTypes_mapped.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['TypeID', 'TypeName'])
    writer.writerows(rows)

print(f'Saved {len(rows)} rows to invTypes_mapped.csv.')
