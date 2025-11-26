export async function warmAudioElement(audio: HTMLAudioElement): Promise<boolean> {
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");

  if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
    audio.load();
  }

  const wasMuted = audio.muted;
  audio.muted = true;
  audio.currentTime = 0;

  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    return true;
  } catch (error) {
    // Autoplay restrictions can reject the promise; swallow the error so we can retry on the next user interaction.
    console.warn("Audio warmup failed", error);
    return false;
  } finally {
    audio.muted = wasMuted;
  }
}
