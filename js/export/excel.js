// Excel 출력 기능 (Placeholder)
console.log('[Excel] Excel 출력 기능 로드');

function exportToExcel() {
  showToast('Excel 출력 기능은 준비 중입니다', 'info');
}

function exportToJSON() {
  const data = AppState.toFirebaseObject();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conference-backup-${Date.now()}.json`;
  a.click();
  showToast('JSON 백업이 다운로드되었습니다', 'success');
}

window.exportToExcel = exportToExcel;
window.exportToJSON = exportToJSON;
