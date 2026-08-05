import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ'); // Rick Astley
    console.log(transcript.slice(0, 3));
  } catch (e) {
    console.error(e);
  }
}

test();
