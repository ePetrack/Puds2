/**
 * Parse CSV file and return array of objects
 */
export function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return data;
}

/**
 * Validate energy data row
 */
export function validateEnergyDataRow(row: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!row.building_name) errors.push('Missing building_name');
  if (!row.timestamp) errors.push('Missing timestamp');
  if (!row.fuel_type) errors.push('Missing fuel_type');

  // Validate fuel type
  const validFuelTypes = ['electricity', 'natural_gas', 'fuel_oil', 'steam', 'chilled_water', 'propane', 'other'];
  if (row.fuel_type && !validFuelTypes.includes(row.fuel_type.toLowerCase())) {
    errors.push(`Invalid fuel_type: ${row.fuel_type}`);
  }

  // Validate numbers
  if (row.usage_kwh && isNaN(Number(row.usage_kwh))) {
    errors.push('usage_kwh must be a number');
  }
  if (row.cost && isNaN(Number(row.cost))) {
    errors.push('cost must be a number');
  }
  if (row.demand_kw && isNaN(Number(row.demand_kw))) {
    errors.push('demand_kw must be a number');
  }

  // Validate date
  if (row.timestamp && isNaN(Date.parse(row.timestamp))) {
    errors.push('Invalid timestamp format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format date for PocketBase
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Convert CSV data to energy data format
 */
export function convertToEnergyData(csvRow: any, buildingId: string): any {
  return {
    building: buildingId,
    timestamp: formatDate(csvRow.timestamp),
    usage_kwh: csvRow.usage_kwh ? Number(csvRow.usage_kwh) : undefined,
    cost: csvRow.cost ? Number(csvRow.cost) : undefined,
    fuel_type: csvRow.fuel_type.toLowerCase(),
    meter_id: csvRow.meter_id || '',
    reading_type: csvRow.reading_type || 'actual',
    demand_kw: csvRow.demand_kw ? Number(csvRow.demand_kw) : undefined,
  };
}
