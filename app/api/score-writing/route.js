// OpenAI Writing Scorer
// POST /api/score-writing
// Body: { questionId, taskType, prompt, response, context? }
// Returns: { score: 0-5, feedback: string, rubric: {} }

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const RUBRICS = {
  write_email: `
Write an Email Scoring Guide

Score 5 - A fully successful response:
The response is effective, is clearly expressed, and shows consistent facility in the use of language.
A typical response displays the following:
- Elaboration that effectively supports the communicative purpose.
- Effective syntactic variety and precise, idiomatic word choice.
- Consistent use of appropriate social conventions, including politeness, register, organization of information, and formulation of actions such as requests, refusals, criticisms, etc.
- Almost no lexical or grammatical errors other than those expected from a competent writer writing under timed conditions, such as common typos, misspellings, or substitutions like there/their.

Score 4 - A generally successful response:
The response is mostly effective and easily understood. Language facility is adequate to the task.
A typical response displays the following:
- Adequate elaboration to support the communicative purpose.
- Syntactic variety and appropriate word choice.
- Mostly appropriate social conventions.
- Few lexical or grammatical errors.

Score 3 - A partially successful response:
The response generally accomplishes the task. Limitations in language facility may prevent parts of the message from being fully clear and effective.
A typical response displays the following:
- Elaboration that partially supports the communicative purpose.
- A moderate range of syntax and vocabulary.
- Some noticeable errors in structure, word forms, use of idiomatic language, and/or social conventions.

Score 2 - A mostly unsuccessful response:
The response reflects an attempt to address the task, but it is mostly ineffective. The message may be limited or difficult to interpret.
A typical response displays the following:
- Limited or irrelevant elaboration.
- Some connected sentence-level language, with a limited range of syntax and vocabulary.
- An accumulation of errors in sentence structure and/or language use.

Score 1 - An unsuccessful response:
The response reflects an ineffective attempt to address the task. The message may be limited to the point of being unintelligible.
A typical response displays the following:
- Very little elaboration, if any.
- Telegraphic language, meaning short and/or disconnected phrases and sentences, with a very limited range of vocabulary.
- Serious and frequent errors in the use of language.
- Minimal original language; any coherent language is mostly borrowed from the stimulus.

Score 0:
The response is blank, rejects the topic, is not in English, is entirely copied from the prompt, is entirely unconnected to the prompt, or consists of arbitrary keystrokes.`,

  write_discussion: `
Write for an Academic Discussion Scoring Guide

Score 5 - A fully successful response:
The response is a relevant and very clearly expressed contribution to the online discussion, and it demonstrates consistent facility in the use of language.
A typical response displays the following:
- Relevant and well-elaborated explanations, exemplifications, and/or details.
- Effective use of a variety of syntactic structures and precise, idiomatic word choice.
- Almost no lexical or grammatical errors other than those expected from a competent writer writing under timed conditions, such as common typos, misspellings, or substitutions like there/their.

Score 4 - A generally successful response:
The response is a relevant contribution to the online discussion, and facility in the use of language allows the writer's ideas to be easily understood.
A typical response displays the following:
- Relevant and adequately elaborated explanations, exemplifications, and/or details.
- A variety of syntactic structures and appropriate word choice.
- Few lexical or grammatical errors.

Score 3 - A partially successful response:
The response is a mostly relevant and mostly understandable contribution to the online discussion, and there is some facility in the use of language.
A typical response displays the following:
- Elaboration in which part of an explanation, example, or detail may be missing, unclear, or irrelevant.
- Some variety in syntactic structures and a range of vocabulary.
- Some noticeable lexical and grammatical errors in sentence structure, word form, or use of idiomatic language.

Score 2 - A mostly unsuccessful response:
The response reflects an attempt to contribute to the online discussion, but limitations in the use of language may make ideas hard to follow.
A typical response displays the following:
- Ideas that may be poorly elaborated or only partially relevant.
- A limited range of syntactic structures and vocabulary.
- An accumulation of errors in sentence structure, word forms, or use.

Score 1 - An unsuccessful response:
The response reflects an ineffective attempt to contribute to the online discussion, and limitations in the use of language may prevent the expression of ideas.
A typical response displays the following:
- Words and phrases that indicate an attempt to address the task but with few or no coherent ideas.
- Severely limited range of syntactic structures and vocabulary.
- Serious and frequent errors in the use of language.
- Minimal original language; any coherent language is mostly borrowed from the stimulus.

Score 0:
The response is blank, rejects the topic, is not in English, is entirely copied from the prompt, is entirely unconnected to the prompt, or consists of arbitrary keystrokes.`,
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
Score the following student response on a scale of 05 using the rubric below.

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
