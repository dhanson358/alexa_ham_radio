/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports en-US lauguage.
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-trivia
 **/

'use strict';

const Alexa = require('alexa-sdk');
const questions = require('./question_bank_clean.json');

const EXAM_NAME = 'Ham Radio General Class'; // TODO Be sure to change this for your skill.
const ANSWER_COUNT = 4; // The number of possible answers per trivia question.
const EXAM_LENGTH = 5;  // The number of questions per trivia game.
const EXAM_STATES = {
    TRIVIA: '_ASKMODE', // Asking exam questions.
    START: '_STARTMODE', // Entry point, start the game.
    HELP: '_HELPMODE', // The user is asking for help.
};
const APP_ID = undefined; // TODO replace with your app ID (OPTIONAL)

function populateExamQuestions() {
    const examQuestions = [];
    const indexList = [];
    let index = questions.length;

    if (EXAM_LENGTH > index) {
        throw new Error('Invalid Exam Length.');
    }

    // Build our test pool
    for (let j = 0; j < EXAM_LENGTH; j += 1) {
        const rand = Math.floor(Math.random() * index);
        //index -= 1;
        examQuestions.push(questions[rand]);
        // @TODO: remove question from pool?
    }

    return examQuestions;
}

function handleUserResponse(userGaveUp) {
    let speechOutput = '';
    let speechOutputAnalysis = '';
    const examQuestions = this.attributes.questions;
    let currentScore = parseInt(this.attributes.score, 10);
    let currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
    var correctAnswerText = this.attributes.correctAnswerText;

    console.log(this.event);

    if (this.event.request.intent.slots.Response.value === this.attributes.correctAnswerValue) {
        currentScore += 1;
        speechOutputAnalysis = 'correct. ';
    } else {
        if (!userGaveUp) {
            speechOutputAnalysis = 'wrong. ';
        }

        speechOutputAnalysis += `The correct answer is ${correctAnswerText}. `;
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (this.attributes.currentQuestionIndex === EXAM_LENGTH - 1) {
        speechOutput = userGaveUp ? '' : 'That answer is ';
        speechOutput += `${speechOutputAnalysis}You got ${currentScore.toString()} out of ${
            EXAM_LENGTH.toString()} questions correct.  Good luck with your exam!`;

        this.emit(':tell', speechOutput);
    } else {
        currentQuestionIndex += 1;
        let question = examQuestions[currentQuestionIndex];
        const spokenQuestion = question.question_text;
        const roundAnswers = question.responses;
        const questionIndexForSpeech = currentQuestionIndex + 1;
        let repromptText = `Question ${questionIndexForSpeech.toString()}. ${spokenQuestion} `;
        var correctAnswerValue = '';

        for (let i = 0; i < question.responses.length; i += 1) {
            let thisResponse = question.responses[i];
            repromptText += `${thisResponse.response_text}. `;
            if (thisResponse.is_correct) {
                correctAnswerText = thisResponse.response_text;
                correctAnswerValue = thisResponse.selection;
            }
        }

        speechOutput += userGaveUp ? '' : 'That answer is ';
        speechOutput += `${speechOutputAnalysis}Your score is ${currentScore.toString()}. ${repromptText}`;

        Object.assign(this.attributes, {
            speechOutput: repromptText,
            repromptText,
            currentQuestionIndex,
            questions: examQuestions,
            score: currentScore,
            correctAnswerValue: correctAnswerValue,
            correctAnswerText: correctAnswerText,
        });

        this.emit(':askWithCard', speechOutput, repromptText, EXAM_NAME, repromptText);
    }
}

const newSessionHandlers = {
    // enter here, setup handlers & state
    'NewSession': function () {
        this.handler.state = EXAM_STATES.START;
        if (this.event.request.type === 'LaunchRequest') {
            this.emitWithState('StartExam', true);
        } else if (this.event.request.type === 'IntentRequest') {
            console.log(`current intent: ${this.event.request.intent.name
                }, current state:${this.handler.state}`);
            const intent = this.event.request.intent.name;
            this.emitWithState(intent);
        }
    },

    'SessionEndedRequest': function () {
        const speechOutput = 'OK, Goodbye!';
        this.emit(':tell', speechOutput);
    },
};

const createStateHandler = Alexa.CreateStateHandler;

const startStateHandlers = createStateHandler(EXAM_STATES.START, {
    'BeginExamIntent': function (newGame) {
        console.log('starting!');
        let speechOutput = newGame ? `Welcome to ${EXAM_NAME}. I will ask you ${EXAM_LENGTH.toString()
        } questions, try to get as many right as you can. Just say the letter of the answer. Let's begin. ` : '';

        const examQuestions = populateExamQuestions();
        console.log(examQuestions);
        const currentQuestionIndex = 0;
        const currentQuestion = examQuestions[currentQuestionIndex];
        let repromptText = `Question 1. ${currentQuestion.question_text} `;
        var correctAnswerText = '';
        var correctAnswerValue = '';

        for (let i = 0; i < currentQuestion.responses.length; i += 1) {
            let thisResponse = currentQuestion.responses[i];
            repromptText += `${thisResponse.response_text}. `;
            if (thisResponse.is_correct) {
                correctAnswerText = thisResponse.response_text;
                correctAnswerValue = thisResponse.selection;
            }
        }


        speechOutput += repromptText;

        Object.assign(this.attributes, {
            speechOutput: repromptText,
            repromptText,
            currentQuestionIndex,
            questions: examQuestions,
            score: 0,
            correctAnswerText: correctAnswerText,
            correctAnswerValue: correctAnswerValue
        });

        // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
        this.handler.state = EXAM_STATES.TRIVIA;

        this.emit(':askWithCard', speechOutput, repromptText, EXAM_NAME, repromptText);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = EXAM_STATES.HELP;
        this.emitWithState('helpTheUser', true);
    },
    'Unhandled': function () {
        this.emit('StartExam', true);
    },
    'SessionEndedRequest': function () {
        const speechOutput = 'OK, Goodbye!';
        this.emit(':tell', speechOutput);
    },
});

const examStateHandlers = createStateHandler(EXAM_STATES.TRIVIA, {
    'ProvideResponseIntent': function () {
        handleUserResponse.call(this, false);
    },
    'DontKnowIntent': function () {
        handleUserResponse.call(this, true);
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = EXAM_STATES.START;
        this.emitWithState('StartExam', false);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptText);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = EXAM_STATES.HELP;
        this.emitWithState('helpTheUser', false);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = EXAM_STATES.HELP;
        const speechOutput = 'Would you like to keep going?';
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Ok, let\'s try again soon.');
    },
    'Unhandled': function () {
        const speechOutput = `Try saying the letter of your answer`;
        this.emit(':ask', speechOutput, speechOutput);
    },
    'EndExamIntent': function () {
        const speechOutput = 'OK, Goodbye!';
        this.emit(':tell', speechOutput);
    },
});

const helpStateHandlers = createStateHandler(EXAM_STATES.HELP, {
    'helpTheUser': function (newExam) {
        const askMessage = newExam ? 'Would you like to start a practice exam?' : 'To repeat the last question, say, repeat. Would you like to keep going?';
        const speechOutput = `I will ask you ${EXAM_LENGTH} multiple choice questions. Respond with the letter of the answer. `
            + `For example, say A, B, C or D. To start a new exam at any time, say, start exam. ${askMessage}`;
        const repromptText = `To give an answer to a question, respond with the letter of the answer . ${askMessage}`;

        this.emit(':ask', speechOutput, repromptText);
    },
    'BeginExamIntent': function () {
        this.handler.state = EXAM_STATES.START;
        this.emitWithState('StartExam', false);
    },
    'AMAZON.RepeatIntent': function () {
        this.emitWithState('helpTheUser');
    },
    'AMAZON.HelpIntent': function () {
        this.emitWithState('helpTheUser', false);
    },
    'AMAZON.YesIntent': function () {
        if (this.attributes.speechOutput && this.attributes.repromptText) {
            this.handler.state = EXAM_STATES.TRIVIA;
            this.emitWithState('AMAZON.RepeatIntent');
        } else {
            this.handler.state = EXAM_STATES.START;
            this.emitWithState('StartExam', false);
        }
    },
    'AMAZON.NoIntent': function () {
        const speechOutput = 'Ok, we\'ll estother time. Goodbye!';
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        const speechOutput = 'Would you like to keep going with your exam?';
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        this.handler.state = EXAM_STATES.TRIVIA;
        this.emitWithState('AMAZON.RepeatIntent');
    },
    'Unhandled': function () {
        const speechOutput = 'Say yes to continue, or no to end the exam.';
        this.emit(':ask', speechOutput, speechOutput);
    },
    'EndExamIntent': function () {
        const speechOutput = 'OK, Goodbye!';
        this.emit(':tell', speechOutput);
    },
});

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, startStateHandlers, examStateHandlers, helpStateHandlers);
    alexa.APP_ID = APP_ID;
    alexa.execute();
};
