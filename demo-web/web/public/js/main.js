const uploadForm = document.getElementById('uploadForm');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('slipFileInput');
const chooseButton = document.getElementById('chooseFileButton');
const selectedFile = document.getElementById('selectedFile');
const inspectionEmpty = document.getElementById('inspectionEmpty');
const imagePreview = document.getElementById('imagePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileStatus = document.getElementById('fileStatus');
const removeFileButton = document.getElementById('removeFileButton');
const extractButton = document.getElementById('extractButton');
const extractButtonLabel = document.getElementById('extractButtonLabel');
const resultPanel = document.getElementById('resultPanel');
const shopName = document.getElementById('shopName');
const totalAmount = document.getElementById('totalAmount');
const maxFileSize = 5 * 1024 * 1024;
const supportedTypes = new Set(['image/png', 'image/jpeg']);
let previewUrl;

function showStatus(message, isError = false) {
  fileStatus.textContent = message;
  fileStatus.classList.toggle('is-error', isError);
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function selectFile(file) {
  if (!file) return;

  if (!supportedTypes.has(file.type)) {
    clearFile();
    showStatus('รองรับเฉพาะไฟล์ภาพ PNG, JPG หรือ JPEG', true);
    return;
  }

  if (file.size === 0 || file.size > maxFileSize) {
    clearFile();
    showStatus('ขนาดไฟล์ต้องไม่เกิน 5 MB', true);
    return;
  }

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  inspectionEmpty.hidden = true;
  selectedFile.hidden = false;
  resultPanel.hidden = true;
  extractButton.disabled = false;
  showStatus('รูปภาพพร้อมสำหรับการอ่านข้อมูล');
}

function clearFile() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
  fileInput.value = '';
  imagePreview.removeAttribute('src');
  selectedFile.hidden = true;
  inspectionEmpty.hidden = false;
  resultPanel.hidden = true;
  extractButton.disabled = true;
  extractButtonLabel.textContent = 'อ่านข้อมูลจากรูปภาพ';
  uploadForm.removeAttribute('aria-busy');
  showStatus('เลือกไฟล์ภาพเพื่อเริ่มต้น');
}

chooseButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => selectFile(fileInput.files[0]));
removeFileButton.addEventListener('click', clearFile);

dropzone.addEventListener('click', (event) => {
  if (!event.target.closest('button')) fileInput.click();
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'dragend', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (event) => {
  if (uploadForm.hasAttribute('aria-busy')) return;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length !== 1) {
    showStatus('เลือกหรือวางรูปภาพได้ครั้งละ 1 ไฟล์', true);
    return;
  }

  selectFile(files[0]);
  if (supportedTypes.has(files[0].type) && files[0].size <= maxFileSize) {
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    fileInput.files = transfer.files;
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('slip', file);
  extractButton.disabled = true;
  chooseButton.disabled = true;
  removeFileButton.disabled = true;
  fileInput.disabled = true;
  extractButtonLabel.textContent = 'กำลังอ่านข้อมูล';
  uploadForm.setAttribute('aria-busy', 'true');
  resultPanel.hidden = true;
  showStatus('กำลังส่งรูปภาพเพื่ออ่านข้อมูล...');

  try {
    const response = await fetch('/api/extract', { method: 'POST', body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'ไม่สามารถอ่านข้อมูลจากรูปภาพได้');

    const amount = payload.data.total_amount;
    shopName.textContent = payload.data.shop_name || 'ไม่พบข้อมูล';
    totalAmount.textContent = Number.isFinite(amount)
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
      : 'ไม่พบข้อมูล';
    resultPanel.hidden = false;
    showStatus('อ่านข้อมูลจากรูปภาพเรียบร้อยแล้ว');
  } catch (error) {
    showStatus(error.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', true);
  } finally {
    extractButton.disabled = false;
    chooseButton.disabled = false;
    removeFileButton.disabled = false;
    fileInput.disabled = false;
    extractButtonLabel.textContent = 'อ่านข้อมูลจากรูปภาพ';
    uploadForm.removeAttribute('aria-busy');
  }
});
