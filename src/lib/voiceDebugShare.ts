import { buildVoiceDebugFileName, buildVoiceDebugReport } from './voiceDebugLog';

// Hands the debug log to the phone's share sheet as a .txt file (iPhone Safari:
// pick "Save to Files" or the Google Drive app). Falls back to a normal file
// download where sharing files isn't supported. Returns a short status message.
export async function shareVoiceDebugReport(): Promise<string> {
  const text = buildVoiceDebugReport();
  const fileName = buildVoiceDebugFileName();
  const nav = globalThis.navigator;

  try {
    const file = new File([text], fileName, { type: 'text/plain' });
    if (nav?.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: fileName });
      return 'Shared';
    }
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      return 'Share cancelled';
    }
    // Any other share failure: fall through to the download fallback.
  }

  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return `Downloaded ${fileName}`;
  } catch {
    return 'Could not save: use Copy';
  }
}

export async function copyVoiceDebugReport(): Promise<string> {
  try {
    await globalThis.navigator.clipboard.writeText(buildVoiceDebugReport());
    return 'Copied';
  } catch {
    return 'Copy failed';
  }
}
