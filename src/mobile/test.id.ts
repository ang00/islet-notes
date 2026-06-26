export const Header = {
  root: 'header.root',
  left: 'header.left',
  back: 'header.back',
  title: 'header.title',
  right: 'header.right',
} as const;

export const BottomTab = {
  root: 'bottom-tab.root',
  diary: 'bottom-tab.diary',
  calendar: 'bottom-tab.calendar',
  settings: 'bottom-tab.settings',
} as const;

export const Calendar = {
  page: 'calendar.page',
  content: 'calendar.content',
  previousMonth: 'calendar.previous-month',
  nextMonth: 'calendar.next-month',
  today: 'calendar.today',
  day: 'calendar.day',
  records: 'calendar.records',
  empty: 'calendar.empty',
  add: 'calendar.add',
  recordItem: 'calendar.record-item',
  recordTime: 'calendar.record-time',
  recordImageButton: 'calendar.record-image-button',
  recordImage: 'calendar.record-image',
  recordAudioButton: 'calendar.record-audio-button',
  recordVideoButton: 'calendar.record-video-button',
  recordVideoThumbnail: 'calendar.record-video-thumbnail',
} as const;

export const DiaryList = {
  page: 'diary-list.page',
  content: 'diary-list.content',
  list: 'diary-list.list',
  sync: 'diary-list.sync',
  addNotebook: 'diary-list.add-notebook',
  notebookItem: 'diary-list.notebook-item',
  notebookName: 'diary-list.notebook-name',
} as const;

export const DiaryCreate = {
  page: 'diary-create.page',
  content: 'diary-create.content',
  nameInput: 'diary-create.name-input',
  save: 'diary-create.save',
} as const;

export const DiarySettings = {
  page: 'diary-settings.page',
  content: 'diary-settings.content',
  name: 'diary-settings.name',
  avatar: 'diary-settings.avatar',
  deleteNotebook: 'diary-settings.delete-notebook',
  deleteConfirm: 'diary-settings.delete-confirm',
  deleteCancel: 'diary-settings.delete-cancel',
  deleteConfirmAction: 'diary-settings.delete-confirm-action',
} as const;

export const DiaryName = {
  page: 'diary-name.page',
  content: 'diary-name.content',
  nameInput: 'diary-name.name-input',
  save: 'diary-name.save',
} as const;

export const DiaryChat = {
  page: 'diary-chat.page',
  list: 'diary-chat.list',
  empty: 'diary-chat.empty',
  row: 'diary-chat.row',
  divider: 'diary-chat.divider',
  textMessage: 'diary-chat.text-message',
  editTextDialog: 'diary-chat.edit-text-dialog',
  editTextInput: 'diary-chat.edit-text-input',
  editTextSave: 'diary-chat.edit-text-save',
  editTextCancel: 'diary-chat.edit-text-cancel',
  moveEntrySheet: 'diary-chat.move-entry-sheet',
  moveEntrySearch: 'diary-chat.move-entry-search',
  moveEntryList: 'diary-chat.move-entry-list',
  moveEntryOption: 'diary-chat.move-entry-option',
  moveEntryCancel: 'diary-chat.move-entry-cancel',
  imageMessage: 'diary-chat.image-message',
  unknownAttachmentMessage: 'diary-chat.unknown-attachment-message',
  unknownEntryMessage: 'diary-chat.unknown-entry-message',
  imageButton: 'diary-chat.image-button',
  image: 'diary-chat.image',
  imagePreviewOverlay: 'diary-chat.image-preview-overlay',
  imagePreview: 'diary-chat.image-preview',
  settings: 'diary-chat.settings',
  inputWrap: 'diary-chat.input-wrap',
  inputError: 'diary-chat.input-error',
  input: 'diary-chat.input',
  voiceToggle: 'diary-chat.voice-toggle',
  holdToTalk: 'diary-chat.hold-to-talk',
  recordingOverlay: 'diary-chat.recording-overlay',
  recordingCancel: 'diary-chat.recording-cancel',
  more: 'diary-chat.more',
  send: 'diary-chat.send',
  plusPanel: 'diary-chat.plus-panel',
  album: 'diary-chat.album',
  camera: 'diary-chat.camera',
  video: 'diary-chat.video',
  videoPreviewSheet: 'diary-chat.video-preview-sheet',
  videoPreviewMediaFrame: 'diary-chat.video-preview-media-frame',
  videoPreviewPlay: 'diary-chat.video-preview-play',
  videoPreviewConfirm: 'diary-chat.video-preview-confirm',
  videoPreviewCancel: 'diary-chat.video-preview-cancel',
  videoOriginalQuality: 'diary-chat.video-original-quality',
  videoMessage: 'diary-chat.video-message',
  videoButton: 'diary-chat.video-button',
  videoPlayerOverlay: 'diary-chat.video-player-overlay',
  videoPlayerClose: 'diary-chat.video-player-close',
  uploadMessage: 'diary-chat.upload-message',
  uploadImage: 'diary-chat.upload-image',
  uploadLoading: 'diary-chat.upload-loading',
  audioMessage: 'diary-chat.audio-message',
  audioTranscript: 'diary-chat.audio-transcript',
  audioTranscribing: 'diary-chat.audio-transcribing',
  uploadAudioSending: 'diary-chat.upload-audio-sending',
  uploadError: 'diary-chat.upload-error',
  uploadFailureSheet: 'diary-chat.upload-failure-sheet',
  uploadFailureReason: 'diary-chat.upload-failure-reason',
  uploadRetry: 'diary-chat.upload-retry',
  uploadDelete: 'diary-chat.upload-delete',
  uploadDeleteConfirm: 'diary-chat.upload-delete-confirm',
  uploadDeleteConfirmAction: 'diary-chat.upload-delete-confirm-action',
} as const;

export const Settings = {
  page: 'settings.page',
  content: 'settings.content',
  profile: 'settings.profile',
  preferences: 'settings.preferences',
  preferencesPage: 'settings.preferences-page',
  preferencesContent: 'settings.preferences-content',
  streak: 'settings.streak',
  totalEntries: 'settings.total-entries',
  notebooks: 'settings.notebooks',
  s3: 'settings.s3',
  ai: 'settings.ai',
  speechRecognition: 'settings.speech-recognition',
  import: 'settings.import',
  language: 'settings.language',
  theme: 'settings.theme',
  version: 'settings.version',
  exitExperience: 'settings.exit-experience',
  seedExperienceData: 'settings.seed-experience-data',
  exitExperienceDialog: 'settings.exit-experience-dialog',
  exitExperienceConfirm: 'settings.exit-experience-confirm',
  exitExperienceCancel: 'settings.exit-experience-cancel',
} as const;

export const AISettings = {
  page: 'ai-settings.page',
  content: 'ai-settings.content',
  speechRecognition: 'ai-settings.speech-recognition',
} as const;

export const SpeechRecognitionSettings = {
  page: 'speech-recognition-settings.page',
  content: 'speech-recognition-settings.content',
  add: 'speech-recognition-settings.add',
  autoTranscribe: 'speech-recognition-settings.auto-transcribe',
  apiKey: 'speech-recognition-settings.api-key',
  secretKey: 'speech-recognition-settings.secret-key',
  test: 'speech-recognition-settings.test',
  save: 'speech-recognition-settings.save',
  delete: 'speech-recognition-settings.delete',
} as const;

export const ImportSettings = {
  page: 'import-settings.page',
  content: 'import-settings.content',
  minimalDiary: 'import-settings.minimal-diary',
} as const;

export const MinimalDiaryImport = {
  page: 'minimal-diary-import.page',
  content: 'minimal-diary-import.content',
  resultPage: 'minimal-diary-import.result-page',
  resultContent: 'minimal-diary-import.result-content',
  file: 'minimal-diary-import.file',
  fileInput: 'minimal-diary-import.file-input',
  existingNotebook: 'minimal-diary-import.existing-notebook',
  start: 'minimal-diary-import.start',
  parseStatus: 'minimal-diary-import.parse-status',
  progress: 'minimal-diary-import.progress',
  resultStatus: 'minimal-diary-import.result-status',
  resultOk: 'minimal-diary-import.result-ok',
  error: 'minimal-diary-import.error',
  successToast: 'minimal-diary-import.success-toast',
} as const;

export const Profile = {
  page: 'profile.page',
  content: 'profile.content',
  avatar: 'profile.avatar',
  avatarImage: 'profile.avatar-image',
  name: 'profile.name',
  error: 'profile.error',
} as const;

export const ProfileName = {
  page: 'profile-name.page',
  content: 'profile-name.content',
  nameInput: 'profile-name.name-input',
  save: 'profile-name.save',
} as const;

export const Startup = {
  page: 'startup.page',
  content: 'startup.content',
  experienceMode: 'startup.experience-mode',
  experienceConfirm: 'startup.experience-confirm',
  experienceCancel: 'startup.experience-cancel',
  experienceConfirmAction: 'startup.experience-confirm-action',
} as const;

export const LanguageSettings = {
  page: 'language-settings.page',
  content: 'language-settings.content',
  option: 'language-settings.option',
  english: 'language-settings.english',
  chinese: 'language-settings.chinese',
} as const;

export const ThemeSettings = {
  page: 'theme-settings.page',
  content: 'theme-settings.content',
  option: 'theme-settings.option',
  auto: 'theme-settings.auto',
  dark: 'theme-settings.dark',
} as const;

export const CloudSync = {
  page: 'cloud-sync.page',
  setupContent: 'cloud-sync.setup-content',
  managementContent: 'cloud-sync.management-content',
  startCard: 'cloud-sync.start-card',
  enableSwitch: 'cloud-sync.enable-switch',
  createMode: 'cloud-sync.create-mode',
  importMode: 'cloud-sync.import-mode',
  channelCard: 'cloud-sync.channel-card',
  channelWebdav: 'cloud-sync.channel-webdav',
  channelS3: 'cloud-sync.channel-s3',
  channelSmb: 'cloud-sync.channel-smb',
  s3Card: 'cloud-sync.s3-card',
  webdavCard: 'cloud-sync.webdav-card',
  smbCard: 'cloud-sync.smb-card',
  webdavUrlInput: 'cloud-sync.webdav-url-input',
  webdavUsernameInput: 'cloud-sync.webdav-username-input',
  webdavPasswordInput: 'cloud-sync.webdav-password-input',
  webdavPrefixInput: 'cloud-sync.webdav-prefix-input',
  endpointInput: 'cloud-sync.endpoint-input',
  regionInput: 'cloud-sync.region-input',
  bucketInput: 'cloud-sync.bucket-input',
  accessKeyIdInput: 'cloud-sync.access-key-id-input',
  secretAccessKeyInput: 'cloud-sync.secret-access-key-input',
  prefixInput: 'cloud-sync.prefix-input',
  forcePathStyle: 'cloud-sync.force-path-style',
  smbHostInput: 'cloud-sync.smb-host-input',
  smbShareInput: 'cloud-sync.smb-share-input',
  smbUsernameInput: 'cloud-sync.smb-username-input',
  smbPasswordInput: 'cloud-sync.smb-password-input',
  smbDomainInput: 'cloud-sync.smb-domain-input',
  smbPrefixInput: 'cloud-sync.smb-prefix-input',
  testConnection: 'cloud-sync.test-connection',
  status: 'cloud-sync.status',
  keyCard: 'cloud-sync.key-card',
  generatedKey: 'cloud-sync.generated-key',
  backedUp: 'cloud-sync.backed-up',
  previousKeyInput: 'cloud-sync.previous-key-input',
  verifyKey: 'cloud-sync.verify-key',
  primaryAction: 'cloud-sync.primary-action',
  managementStatus: 'cloud-sync.management-status',
  storageGroup: 'cloud-sync.storage-group',
  storageSummary: 'cloud-sync.storage-summary',
  storageDetail: 'cloud-sync.storage-detail',
  syncContentGroup: 'cloud-sync.content-group',
  recoveryKeyValue: 'cloud-sync.recovery-key-value',
  copyRecoveryKey: 'cloud-sync.copy-recovery-key',
  deleteSync: 'cloud-sync.delete-sync',
  deleteConfirm: 'cloud-sync.delete-confirm',
  deleteBackedUp: 'cloud-sync.delete-backed-up',
  deleteConfirmAction: 'cloud-sync.delete-confirm-action',
} as const;

export const GroupTagSettings = {
  page: 'group-tag-settings.page',
  content: 'group-tag-settings.content',
  search: 'group-tag-settings.search',
  add: 'group-tag-settings.add',
  edit: 'group-tag-settings.edit',
  delete: 'group-tag-settings.delete',
} as const;
