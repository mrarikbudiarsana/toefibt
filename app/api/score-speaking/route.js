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
Listen and Repeat Task Scoring Guide

Score 5:
The response exactly repeats the prompt.
A typical response exhibits the following:
- The response is fully intelligible and is an exact repetition of the prompt.

Score 4:
The response captures the meaning expressed in the prompt, but it is not an exact repetition.
A typical response exhibits the following:
- Minor changes in words or grammar are present that do not substantially change the meaning of the prompt.
- One or two function words may be missing or changed.
- A content word may be missing in longer stimuli or replaced with a related word.
- Markers of tense, aspect, or number may be missing or incorrect.
- Two words may be transposed.
- One or two content words may be ambiguous because of imprecise pronunciation. The speaker may self-correct, but successfully completes the response.

Score 3:
The response is essentially full, but it does not accurately capture the original meaning.
A typical response exhibits the following:
- The response contains a majority of the content words or ideas in the prompt.
- Multiple function words may be changed or missing; one or more content words may be missing or substantively changed.
- The response is a full sentence.
- In some cases, intelligibility issues cause occasional difficulty in understanding meaning. The speaker may struggle over a word or phrase or run words together, reducing intelligibility.

Score 2:
The response is missing a significant part of the prompt and/or is highly inaccurate.
A typical response exhibits the following:
- A large portion of the prompt is missing, and important original meaning is left out.
- The speaker may repeat the first part of the sentence, then stop or fill with inaccurate content and/or include the last few words.
- The response is not a self-standing sentence; meaning is fragmentary.
- Intelligibility is low; the response would be difficult to understand for a listener unfamiliar with the prompt.

Score 1:
The response captures very little of the prompt or is largely unintelligible.
A typical response exhibits the following:
- A minimal response of a few words is made; most of the prompt is missing.
- The response is recognizable as an attempt to repeat the prompt, but it is mostly unintelligible.

Score 0:
No response, or the response is entirely unintelligible, or there is no English in the response, or the content is entirely unconnected to the prompt, or it consists only of phrases such as "I don't know".`,

  take_interview: `
Take an Interview Task Scoring Guide

Score 5 - A fully successful response:
The response fully addresses the question, and it is clear and fluent.
A typical response exhibits the following:
- The response is on topic and well elaborated.
- Good conversational speaking pace is maintained with appropriate and natural use of pauses.
- Pronunciation is easily intelligible; rhythm and intonation effectively convey meaning.
- A range of accurate grammar and vocabulary allows clear expression of precise meanings.

Score 4 - A generally successful response:
The response addresses the questions, and it is reasonably clear.
A typical response exhibits the following:
- The response is on topic and elaborated, but it may lack effective sentence-level connectors.
- Good speaking pace is generally maintained, with some pausing that may minimally affect flow.
- Intelligibility and meaning are not impeded by pronunciation, rhythm, and intonation, although occasional words or phrases may require minor effort to understand.
- Grammar and vocabulary are adequate to express general meanings most of the time.

Score 3 - A partially successful response:
The response addresses the question but with limited elaboration and/or clarity.
A typical response exhibits the following:
- The response is generally on topic, but elaboration may be relatively limited.
- Frequent or lengthy pauses result in a choppy pace; fill words are frequent.
- Intelligibility is sometimes affected by inaccuracies in word-level pronunciation or stress/rhythm.
- Limited range and accuracy of grammar and vocabulary noticeably restrict the precision and clarity of meanings.

Score 2 - A mostly unsuccessful response:
The response reflects an attempt to address the question, but it is not supported in a meaningful and/or intelligible way.
A typical response exhibits the following:
- The response is minimally connected to the interviewer's question, but it has little or no relevant elaboration or consists mainly of language from the question.
- Intelligibility is limited; the speaker's intended meaning is often difficult to discern.
- The response shows a very limited range of grammar and vocabulary.

Score 1 - An unsuccessful response:
The response minimally addresses the question, and it may demonstrate very limited control of language.
A typical response exhibits the following:
- The response is only vaguely connected to language in the interviewer's question.
- The response is mostly unintelligible.
- The response consists of mainly isolated words or phrases.

Score 0:
No response, or the response is entirely unintelligible, or there is no English in the response, or the content is entirely unconnected to the prompt, or it consists only of phrases such as "I don't know".`,
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

    const taskInstruction = taskType === 'listen_repeat'
      ? 'Compare the student transcript directly against the original prompt. Score how accurately and intelligibly the student repeated the prompt, preserving its words and meaning.'
      : 'Score the student transcript as an independent spoken response to the prompt.';

    const systemPrompt = `You are an expert TOEFL iBT speaking examiner trained in ETS scoring rubrics.
Score the following student's spoken response (provided as a transcript) on a scale of 0-5.
${taskInstruction}

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
