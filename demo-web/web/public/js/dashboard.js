const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('slipFileInput');
const chooseButton = document.getElementById('chooseFileButton');
const verifyButton = document.getElementById('verifyButton');
const removeFileButton = document.getElementById('removeFileButton');
const fileStatus = document.getElementById('fileStatus');
const previewImage = document.getElementById('slipPreview');
const previewFileName = document.getElementById('previewFileName');
const previewFileMeta = document.getElementById('previewFileMeta');
const extractedAmount = document.getElementById('extractedAmount');
const extractedShopName = document.getElementById('extractedShopName');
const progressTrack = document.getElementById('progressTrack');
const progressBar = document.getElementById('progressBar');
const progressStatus = document.getElementById('progressStatus');
const verifyButtonLabel = document.getElementById('verifyButtonLabel');
const maxFileSize = 5 * 1024 * 1024;
const supportedTypes = new Set(['image/png', 'image/jpeg']);
const defaultPreview = {
  image: previewImage.src,
  fileName: previewFileName.textContent,
  fileMeta: previewFileMeta.textContent,
  amount: extractedAmount.textContent,
  shopName: extractedShopName.textContent
};
let previewUrl;
let isBusy = false;

function showStatus(message, isError = false) {
  fileStatus.textContent = message;
  fileStatus.classList.toggle('is-error', isError);
}

function setProgress(value, message) {
  progressTrack.setAttribute('aria-valuenow', String(value));
  progressBar.style.width = `${value}%`;
  progressStatus.textContent = message;
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function resetFile(message = 'พร้อมรอไฟล์สลิปสำหรับการสแกน') {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
  fileInput.value = '';
  previewImage.src = defaultPreview.image;
  previewFileName.textContent = defaultPreview.fileName;
  previewFileMeta.textContent = defaultPreview.fileMeta;
  extractedAmount.textContent = defaultPreview.amount;
  extractedShopName.textContent = defaultPreview.shopName;
  setProgress(0, 'พร้อมเลือกไฟล์');
  showStatus(message);
  verifyButton.disabled = isBusy;
}

function selectFile(file) {
  if (!file) return;

  if (!supportedTypes.has(file.type)) {
    resetFile('รองรับเฉพาะไฟล์ภาพ PNG, JPG หรือ JPEG');
    fileStatus.classList.add('is-error');
    return;
  }

  if (file.size === 0 || file.size > maxFileSize) {
    resetFile('ขนาดไฟล์ต้องไม่เกิน 5 MB');
    fileStatus.classList.add('is-error');
    return;
  }

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  previewFileName.textContent = file.name;
  previewFileMeta.textContent = `${formatFileSize(file.size)} • ${file.type === 'image/png' ? 'PNG' : 'JPG'}`;
  extractedAmount.textContent = 'รออ่านข้อมูล';
  extractedShopName.textContent = 'รออ่านข้อมูล';
  setProgress(0, 'พร้อมอ่านข้อมูล');
  verifyButton.disabled = false;
  showStatus('รูปภาพพร้อมสำหรับการอ่านข้อมูล');
}

chooseButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => selectFile(fileInput.files[0]));
removeFileButton.addEventListener('click', () => resetFile());
verifyButton.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    showStatus('กรุณาเลือกรูปสลิปก่อนดำเนินการ', true);
    chooseButton.focus();
    return;
  }

  if (isBusy) return;

  isBusy = true;
  verifyButton.disabled = true;
  chooseButton.disabled = true;
  removeFileButton.disabled = true;
  fileInput.disabled = true;
  dropzone.setAttribute('aria-busy', 'true');
  verifyButtonLabel.textContent = 'กำลังอ่านข้อมูล';
  setProgress(60, 'กำลังอ่านข้อมูล');
  showStatus('กำลังส่งรูปภาพเพื่ออ่านข้อมูล...');

  const formData = new FormData();
  formData.append('slip', file);

  try {
    const response = await fetch('/api/extract', { method: 'POST', body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'ไม่สามารถอ่านข้อมูลจากรูปภาพได้');

    const amount = payload.data.total_amount;
    extractedAmount.textContent = Number.isFinite(amount)
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
      : 'ไม่พบข้อมูล';
    extractedShopName.textContent = payload.data.shop_name || 'ไม่พบข้อมูล';
    setProgress(100, 'อ่านข้อมูลแล้ว');
    showStatus('อ่านข้อมูลจากรูปภาพเรียบร้อยแล้ว');
  } catch (error) {
    setProgress(0, 'อ่านข้อมูลไม่สำเร็จ');
    showStatus(error.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', true);
  } finally {
    isBusy = false;
    verifyButton.disabled = !fileInput.files[0];
    chooseButton.disabled = false;
    removeFileButton.disabled = false;
    fileInput.disabled = false;
    dropzone.removeAttribute('aria-busy');
    verifyButtonLabel.textContent = 'ดำเนินการตรวจสอบข้อมูล (VERIFY)';
  }
});

dropzone.addEventListener('click', (event) => {
  if (!event.target.closest('button')) fileInput.click();
});

dropzone.addEventListener('keydown', (event) => {
  if (event.target !== dropzone || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  fileInput.click();
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!isBusy) dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'dragend', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (event) => {
  if (isBusy) return;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length !== 1) {
    showStatus('เลือกหรือวางรูปภาพได้ครั้งละ 1 ไฟล์', true);
    return;
  }

  selectFile(files[0]);
  if (supportedTypes.has(files[0].type) && files[0].size > 0 && files[0].size <= maxFileSize) {
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    fileInput.files = transfer.files;
  }
});