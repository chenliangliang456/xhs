/** 将图片 URL 转为 data URL（用于素材库 A 图作为锚点） */
export async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`图片加载失败 (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
