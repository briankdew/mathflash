// document.addEventListener('DOMContentLoaded', () => {
//     const problemElement = document.getElementById('problem');
//     const flashcard = document.querySelector('.flashcard');
//     let currentOperation = null;

//     const operators = {
//         add: '+',
//         subtract: '−',
//         multiply: '×',
//         divide: '÷'
//     };

//     document.querySelectorAll('nav ul li img').forEach(img => {
//         img.addEventListener('click', () => {
//             currentOperation = img.id;
//             generateProblem();
//         });
//     });

//     flashcard.addEventListener('click', () => {
//         if (problemElement.textContent.includes('?')) {
//             revealAnswer();
//         } else {
//             generateProblem();
//         }
//     });

//     function generateProblem() {
//         if (!currentOperation) return;
//         const num1 = Math.floor(Math.random() * 10);
//         const num2 = Math.floor(Math.random() * 10);
//         let problem = `${num1} ${operators[currentOperation]} ${num2} = ?`;
//         problemElement.textContent = problem;
//     }

//     function revealAnswer() {
//         if (!currentOperation) return;
//         const problemText = problemElement.textContent;
//         const [num1, , num2] = problemText.split(' ');
//         let answer;
//         switch (currentOperation) {
//             case 'add':
//                 answer = parseInt(num1) + parseInt(num2);
//                 break;
//             case 'subtract':
//                 answer = parseInt(num1) - parseInt(num2);
//                 break;
//             case 'multiply':
//                 answer = parseInt(num1) * parseInt(num2);
//                 break;
//             case 'divide':
//                 answer = parseInt(num1) / parseInt(num2);
//                 break;
//         }
//         problemElement.textContent = problemText.replace('?', answer);
//     }
// });

let firstValue = '20';
let operator = '+';
let secondValue = '20';
let answer = '40';

document.getElementById('first-value').innerText = firstValue;
document.getElementById('operator').innerText = operator;
document.getElementById('second-value').innerText = secondValue;
document.getElementById('answer').innerText = answer;
