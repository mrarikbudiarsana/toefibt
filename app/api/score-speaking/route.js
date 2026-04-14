// OpenAI Speaking Scorer
// POST /api/score-speaking
// Body: { questionId, taskType, prompt, audioUrl, transcript? }
// Returns: { score: 0-5, feedback: string, rubric: {} }
//
// Note: We use Whisper to transcribe the audio, then GPT to score the transcript.

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const RUBRICS = {
  listen_repeat: `
Score 5: Near-perfect repetition — all words correct, natural rhythm and intonation.
Score 4: Minor omissions or substitutions, generally intelligible.
Score 3: Several errors but key content present, somewhat intelligible.
Score 2: Significant errors, limited intelligibility.
Score 1: Barely intelligible, major errors throughout.
Score 0: No response or completely unintelligible.`,

  take_interview: `
Score 5: Fully addresses the question, fluent delivery, rich vocabulary, clear organization, minimal errors.
Score 4: Addresses the question, generally fluent with occasional hesitation, adequate vocabulary.
Score 3: Partially addresses the question, noticeable pauses/errors, limited vocabulary.
Score 2: Minimal response, significant fluency/accuracy issues.
Score 1: Very limited response.
Score 0: No relevant response.`,
};

export async function POST(request) {
  try {
    const { questionId, taskType, prompt, audioUrl, transcript: providedTranscript } = await request.json();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let transcript = providedTranscript;

    // Step 1: Transcribe audio with Whisper (if audio URL provided and no transcript)
    if (!transcript && audioUrl) {
      try {
        const audioResponse = await fetch(audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();
        const audioFile = new File([audioBuffer], 'response.webm', { type: 'audio/webm' });

        const transcription = await client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'en',
        });
        transcript = transcription.text;
      } catch (transcribeErr) {
        console.error('[score-speaking] Whisper failed:', transcribeErr);
        return NextResponse.json({ score: null, feedback: 'Audio transcription failed.', rubric: {} }, { status: 500 });
      }
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ score: 0, feedback: 'No spoken response detected.', rubric: {}, transcript: '' });
    }

    // Step 2: Score transcript with GPT
    const rubric = RUBRICS[taskType] ?? RUBRICS.take_interview;

    const systemPrompt = `You are an expert TOEFL iBT speaking examiner trained in ETS scoring rubrics.
Score the following student's spoken response (provided as a transcript) on a scale of 0–5.

Task type: ${taskType}
Original prompt: ${prompt}

Scoring Rubric:
${rubric}

Return ONLY valid JSON:
{
  "score": <integer 0-5>,
  "feedback": "<2-3 sentence constructive feedback>",
  "rubric": {
    "delivery": "<note on fluency, pace, pronunciation>",
    "languageUse": "<note on vocabulary and grammar>",
    "topicDevelopment": "<note on content and organization>"
  }
}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Student transcript:\n${transcript}` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({
      score: Math.max(0, Math.min(5, parseInt(result.score ?? 0))),
      feedback: result.feedback ?? '',
      rubric: result.rubric ?? {},
      transcript,
    });
  } catch (err) {
    console.error('[score-speaking]', err);
    return NextResponse.json(
      { error: err.message, score: null, feedback: 'Scoring unavailable.' },
      { status: 500 }
    );
  }
}
