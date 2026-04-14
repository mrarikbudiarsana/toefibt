// OpenAI Writing Scorer
// POST /api/score-writing
// Body: { questionId, taskType, prompt, response, context? }
// Returns: { score: 0-5, feedback: string, rubric: {} }

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const RUBRICS = {
  write_email: `
Score 5 (Excellent): Fully addresses the task, appropriate format and register, rich vocabulary, minor errors only.
Score 4 (Good): Addresses task well, generally appropriate format, some vocabulary/grammar errors that don't impede meaning.
Score 3 (Fair): Partially addresses task, format issues, noticeable errors but meaning is mostly clear.
Score 2 (Limited): Task partially addressed, significant errors, limited vocabulary.
Score 1 (Poor): Barely addresses task, many errors, difficult to understand.
Score 0: No response, off-topic, or copied from the prompt.`,

  write_discussion: `
Score 5 (Excellent): Clearly expresses opinion, well-supported with specific examples/reasons, cohesive, rich language, 100+ words.
Score 4 (Good): Expresses opinion with adequate support, mostly coherent, some errors.
Score 3 (Fair): Opinion present but weakly supported, noticeable errors, may be brief.
Score 2 (Limited): Vague opinion, little support, many errors.
Score 1 (Poor): Unclear position, very limited content.
Score 0: No relevant response.`,
};

export async function POST(request) {
  try {
    const { questionId, taskType, prompt, response, context } = await request.json();

    if (!response?.trim()) {
      return NextResponse.json({ score: 0, feedback: 'No response provided.', rubric: {} });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const rubric = RUBRICS[taskType] ?? RUBRICS.write_discussion;

    const systemPrompt = `You are an expert TOEFL iBT writing examiner trained in ETS scoring rubrics.
Score the following student response on a scale of 0–5 using the rubric below.

Rubric:
${rubric}

Return ONLY valid JSON in this exact format:
{
  "score": <integer 0-5>,
  "feedback": "<2-3 sentence constructive feedback for the student>",
  "rubric": {
    "taskCompletion": "<brief note>",
    "languageUse": "<brief note>",
    "coherence": "<brief note>"
  }
}`;

    const userPrompt = `Task type: ${taskType}
${context ? `Context: ${context}\n` : ''}Prompt: ${prompt}

Student response:
${response}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({
      score: Math.max(0, Math.min(5, parseInt(result.score ?? 0))),
      feedback: result.feedback ?? '',
      rubric: result.rubric ?? {},
    });
  } catch (err) {
    console.error('[score-writing]', err);
    return NextResponse.json(
      { error: err.message, score: null, feedback: 'Scoring unavailable.' },
      { status: 500 }
    );
  }
}
