const archives = {"portfolio-hd-4.zip": 8, "portfolio-hd-1.zip": 12, "portfolio-hd-2.zip": 13};
for (const link of document.querySelectorAll('a[download]')) {
  const filename = link.getAttribute('href').split('/').pop();
  const count = archives[filename];
  if (!count) continue;
  link.setAttribute('role', 'button');
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    if (link.dataset.loading) return;
    link.dataset.loading = 'true';
    const label = link.textContent;
    link.textContent = '正在下载…';
    try {
      const pieces = await Promise.all(Array.from({ length: count }, async (_, index) => {
        const request = await fetch('downloads/' + filename + '.part' + String(index).padStart(2, '0'));
        if (!request.ok) throw new Error('下载失败');
        return request.arrayBuffer();
      }));
      const url = URL.createObjectURL(new Blob(pieces, { type: 'application/zip' }));
      const download = document.createElement('a');
      download.href = url;
      download.download = filename;
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      link.textContent = label;
    } catch {
      link.textContent = '下载失败，点击重试';
    } finally {
      delete link.dataset.loading;
    }
  });
}
