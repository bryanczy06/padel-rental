import * as XLSX from 'xlsx'

function download(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export function exportRackets(rackets, pricePerRental, clubName) {
  const price = pricePerRental ?? 0
  const rows = rackets.map(r => ({
    'שם מחבט':      r.name,
    'מותג':         r.brand || '',
    'סטטוס':        r.archived_at ? 'ארכיון' : r.status === 'available' ? 'פנוי' : r.status === 'rented' ? 'מושכר' : 'תיקון',
    'מספר שימושים': r.usage_count,
    'הכנסות (₪)':   price ? r.usage_count * price : '',
    'הערות':        r.notes || '',
    'תאריך קליטה':  r.created_at ? new Date(r.created_at).toLocaleDateString('he-IL') : '',
    'תאריך סיום':   r.archived_at ? new Date(r.archived_at).toLocaleDateString('he-IL') : '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [20, 14, 10, 16, 16, 20, 14, 14].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'מחבטים')
  download(wb, `מחבטים_${clubName || 'מועדון'}_${today()}.xlsx`)
}

export function exportCustomers(customers) {
  const rows = customers.map(c => ({
    'שם מלא':    c.full_name,
    'טלפון':     c.phone || '',
    'מייל':      c.email || '',
    'נקודות':    c.points ?? 0,
    'תאריך הצטרפות': c.created_at ? new Date(c.created_at).toLocaleDateString('he-IL') : '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [22, 14, 26, 10, 16].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'לקוחות')
  download(wb, `לקוחות_${today()}.xlsx`)
}

export function exportStaff(staff) {
  const rows = staff.map(s => ({
    'שם מלא':  s.full_name,
    'מייל':    s.email || '',
    'טלפון':   s.phone || '',
    'תפקיד':   s.role === 'admin' ? 'מנהל' : 'עובד',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [22, 26, 14, 10].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'עובדים')
  download(wb, `עובדים_${today()}.xlsx`)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
