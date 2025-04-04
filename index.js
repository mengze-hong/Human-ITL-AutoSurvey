let apiKey = '';
let selectedMode = 'chat';
let userInfo = {};
let chatHistory = [];
let clicked = [];
// let eyeTracker = [];
let timeoutId; 

let startTime;
let questionsSent = 0;
let musicConverted = 0;

let userInputCount = 0;

// // Function to remove the video container
// function removeVideoContainer() {
//     const videoContainer = document.getElementById('webgazerVideoContainer');
//     if (videoContainer) {
//         videoContainer.remove();
//     }
// }

// webgazer.setGazeListener(function(data, elapsedTime) {
//     if (data == null) {
//         return;
//     }

//     var xprediction = data.x; // these x coordinates are relative to the viewport
//     var yprediction = data.y; // these y coordinates are relative to the viewport
//     eyeTracker.push({ index: eyeTracker.length, coordinates: `${xprediction}, ${yprediction}` });

//     setTimeout(() => {
//         canOutputData = true;
//     }, 1000);
// }).begin();



// Track the start time
$(document).ready(function() {
    startTime = new Date();
});


// Track the number of music conversions
document.getElementById('convert-btn').addEventListener('click', function() {
    musicConverted++;
});

// Function to calculate session duration
function calculateSessionDuration() {
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes} minutes and ${seconds} seconds`;
}

// Display session summary in the modal
function displaySessionSummary() {
    document.getElementById('session-duration').innerText = calculateSessionDuration();
    document.getElementById('questions-sent').innerText = questionsSent;
    document.getElementById('clicks-count').innerText = clicked.length;
    document.getElementById('music-converted').innerText = musicConverted;
    $('#endSessionModal').modal('show');
}

// Trigger the end session modal
document.getElementById('download-btn').addEventListener('click', displaySessionSummary);


$(document).ready(function() {
    // Show the modal on page load
    $('#loginModal').modal('show');

    $('#loginForm').on('submit', function(event) {
        event.preventDefault();
        userInfo.name = $('#userName').val();
        userInfo.level = $('#userLevel').val();
        userInfo.loginTime = new Date().toLocaleString();

        apiKey = document.getElementById('api-key-input').value.trim();

    

        // Close the modal
        $('#loginModal').modal('hide');
    });


    // Handle CSV download
    $('#download-btn').on('click', function() {
        // User and session information CSV
        let recordedData = "data:text/csv;charset=utf-8,";
        recordedData += `Name,${userInfo.name}\n`;
        recordedData += `Level,${userInfo.level}\n`;
        recordedData += `Login Time,${userInfo.loginTime}\n\n`;
        recordedData += `Session Duration,${calculateSessionDuration()}\n`;
        recordedData += `Questions Sent,${questionsSent}\n`;
        recordedData += `Clicks on Music Sheet,${clicked.length}\n`;

        recordedData += "\n%%\n"

        // Chat history
        recordedData += "Sender,Message\n";
        chatHistory.forEach(function(row) {
            recordedData += `${row.sender},${row.message}\n`;
        });

        recordedData += "\n%%\n"

        // Clicked positions
        recordedData += "Index,Position,Note\n";
        clicked.forEach(function(row) {
            recordedData += `${row.index},${row.position},${row.note}\n`;
        });

        // recordedData += "\n%%\n"

        // // Clicked positions CSV
        // recordedData += "Index,Position\n";
        // eyeTracker.forEach(function(row) {
        //     recordedData += `${row.index},${row.coordinates}\n`;
        // });

        // Download the CSV files
        downloadCsv(recordedData, `${userInfo.name}_data.csv`);
    });
});

// Function to download CSV
function downloadCsv(content, filename) {
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Automatically trigger close and download on page unload
// window.addEventListener('beforeunload', function() {
//     // Simulate a click on the close button
//     const closeButton = document.querySelector('#download-btn');
//     if (closeButton) {
//         closeButton.click();
//     }
// });

window.onbeforeunload = function(e) {
    const closeButton = document.querySelector('#download-btn');
    if (closeButton) {
        closeButton.click();
    }
    return 'Please press the Logout button to logout.';
};

// document.getElementById('chat-button').addEventListener('click', function() {
//     selectedMode = 'chat';
//     document.getElementById('chat-button').classList.add('active');
//     document.getElementById('modify-button').classList.remove('active');
// });

// document.getElementById('modify-button').addEventListener('click', function() {
//     selectedMode = 'modify';
//     document.getElementById('chat-button').classList.remove('active');
//     document.getElementById('modify-button').classList.add('active');
// });

// Function to handle user input
function handleUserInput() {
    userInputCount++;
    if (userInputCount % (Math.floor(Math.random() * 3) + 3) === 0) {
        setTimeout(showGreeting, 10000); // 10-second delay
        userInputCount++;
    }
}

// Show greeting message
// Show greeting message
function showGreeting() {
    const responseOutput = document.getElementById('response-output');
    const fullMessage = `[Role] You are a helpful music education assistant that will support beginner students in learning music.\n[Requirement] You are required to generate one short encouragement message ONLY which encourages the beginner student to learn music, such as "Music is fun, isn't it?" and "Enjoy yourself in the playground of musical notes and rhythms." You must output a motivating sentence and avoid any extra output. You must ensure a diversity of output, be creative!\n[Output Format] <one sentence of encouragement ONLY, no extra output>`;
    
    $.ajax({
        url: 'https://api.xty.app/v1/chat/completions',
        type: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        data: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: fullMessage }],
            stream: false,
            temperature: 1.0
        }),
        success: function(response) {
            const content = response.choices[0].message.content;
            chatHistory.push({ sender: 'LLM', message: content });
            const responseMessage = document.createElement('div');
            responseMessage.className = 'alert alert-success';
            responseMessage.innerText = content;
            responseOutput.appendChild(responseMessage);
            responseOutput.scrollTop = responseOutput.scrollHeight;
        }
    });
}

document.getElementById('save-api-key').addEventListener('click', () => {
    apiKey = document.getElementById('api-key-input').value.trim();
    if (apiKey) {
        alert('API Key saved successfully!');
        const modalElement = document.getElementById('settingsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide(); // Close the modal
    } else {
        alert('Please enter a valid API key.');
    }
});

document.getElementById('convert-btn').addEventListener('click', () => {
    const inputContainer = document.getElementById('input-container');
    const convertButton = document.getElementById('convert-btn');

    // if (inputContainer.style.display != 'none') {
        const abcNotation = document.getElementById('abc-input').value;
        if (abcNotation) {
            ABCJS.renderAbc("music-sheet", abcNotation);
            const svg = document.querySelector("#music-sheet svg");
            if (svg) {
                svg.setAttribute('id', 'music-sheet-svg');
                svgPanZoom(svg, {
                    panEnabled: true
                    , controlIconsEnabled: false
                    , zoomEnabled: true
                    , dblClickZoomEnabled: false
                    , mouseWheelZoomEnabled: true
                    , preventMouseEventsDefault: true
                    , zoomScaleSensitivity: 0.2
                    , minZoom: 0.5
                    , maxZoom: 10
                    , fit: true
                    , contain: false
                    , center: true
                    });
                }
            // Add click event listener to each note
            const notes = svg.querySelectorAll('.abcjs-notehead');
            // notes.forEach(note => {
            //     note.addEventListener('click', async function() {
            //         // alert(`Note clicked: ${note.getAttribute('data-name')}`);
            //         const noteName = note.getAttribute('data-name');
            //         const keyCode = getKeyFromName(noteName)
            //         const audio = document.querySelector(`audio[id="${keyCode}"]`)
            //         audio.currentTime = 0;
            //         audio.play();
            //         // Get cursor position
            //         const cursorX = event.clientX;
            //         const cursorY = event.clientY;

            //         // Create text element to display note name
            //         const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            //         textElement.setAttribute('x', cursorX);
            //         textElement.setAttribute('y', cursorY - 20); // Position above the cursor
            //         textElement.setAttribute('text-anchor', 'middle');
            //         textElement.setAttribute('fill', 'red'); // Make text color red for visibility
            //         textElement.setAttribute('font-size', '24px'); // Increase font size for visibility
            //         textElement.setAttribute('font-weight', 'bold'); // Make text bold
            //         textElement.textContent = noteName;

            //         // Append text element to the SVG
            //         svg.appendChild(textElement);

            //         // Remove the text element after 0.5 seconds
            //         setTimeout(() => {
            //             audio.pause();
            //             audio.currentTime = 0;
            //         }, 1000);
            //         clicked.push({"index": clicked.length, "position": note.getAttribute('d'), "note": noteName})
            //     });
            // });
            const blobk = svg.querySelectorAll('g[data-name="note"]');
            blobk.forEach(noteGroup => {
                noteGroup.addEventListener('click', async function(e) {
                    const noteHead = noteGroup.querySelector('.abcjs-notehead');
                    const noteName = noteGroup.querySelector('.abcjs-notehead').getAttribute('data-name');
                    const keyCode = getKeyFromName(noteName);
                    const audio = document.querySelector(`audio[id="${keyCode}"]`);
                    if (audio) {
                        audio.currentTime = 0;
                        audio.play();
                    }
                    // Get note position
                    // const noteBBox = noteHead.getBBox();
                    // const noteX = noteBBox.x + noteBBox.width / 2; // Center of the note
                    // const noteY = noteBBox.y;

                    const noteX = e.clientX;
                    const noteY = e.clientY;


                    // Create text element to display note name
                    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    textElement.setAttribute('x', `${noteX-45}px`);
                    textElement.setAttribute('y', `${noteY-275}px`); // Position above the note
                    textElement.setAttribute('text-anchor', 'middle'); // Center the text
                    textElement.setAttribute('fill', 'red'); // Make text color red for visibility
                    textElement.setAttribute('font-size', '20px'); // Increase font size for visibility
                    textElement.setAttribute('font-weight', 'bold'); // Make text bold
                    textElement.setAttribute('position', 'absolute'); // Make text bold
                    textElement.textContent = keyCode.slice(0, -1);

                    // Append text element to the SVG
                    svg.appendChild(textElement);

                    // Remove the text element after 2 seconds
                    setTimeout(() => {
                        if (textElement.parentNode === svg) {
                            svg.removeChild(textElement);
                        }
                    }, 2000);
                    clicked.push({"index": clicked.length, "position": noteGroup.getAttribute('data-index'), "note": noteName})
                });
            });

        } else {
            alert("Please enter ABC notation.");
        }
    
        // inputContainer.style.display = 'none';
        // convertButton.innerText = 'New Music Sheet'
    // } else {
    //     inputContainer.style.display = 'block'
    //     convertButton.innerText = 'Convect to Music Sheet'
    // }

});


// document.getElementById('pdf-btn').addEventListener('click', async () => {
//     const svgElement = document.getElementById('music-sheet-svg');
//     if (svgElement) {
//         const svgString = new XMLSerializer().serializeToString(svgElement);
//         const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });

//         const pdfDoc = await PDFLib.PDFDocument.create();
//         const page = pdfDoc.addPage([svgElement.clientWidth, svgElement.clientHeight]);
//         const svgImage = await pdfDoc.embedSvg(svgBlob);
//         page.drawImage(svgImage, {
//             x: 0,
//             y: 0,
//             width: svgElement.clientWidth,
//             height: svgElement.clientHeight,
//         });

//         const pdfBytes = await pdfDoc.save();
//         const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

//         const downloadLink = document.createElement('a');
//         downloadLink.href = URL.createObjectURL(pdfBlob);
//         downloadLink.download = 'music_sheet.pdf';
//         downloadLink.click();
//     } else {
//         alert("Please convert to music sheet first.");
//     }
// });

// document.getElementById('midi-btn').addEventListener('click', () => {
//     const abcNotation = document.getElementById('abc-input').value;
//     if (abcNotation) {
//         const midiOptions = { generateDownload: false };
//         ABCJS.synth.getMidiFile(abcNotation, midiOptions)
//             .then(midi => {
//                 const audio = document.getElementById('midi-output');
//                 audio.src = URL.createObjectURL(new Blob([midi], { type: "audio/midi" }));
//                 audio.play();
//             })
//             .catch(error => {
//                 alert("Error generating MIDI: " + error.message);
//             });
//     } else {
//         alert("Please enter ABC notation.");
//     }
// });

function sendMessage() {
    const userInput = document.getElementById('user-input').value.trim();
    const abcNotation = document.getElementById('abc-input').value.trim();
    const responseOutput = document.getElementById('response-output');
    const loadingSpinner = document.getElementById('loadingSpinner');

    questionsSent++;
    chatHistory.push({ sender: 'User', message: userInput });

    if (userInput !== "") {
        handleUserInput();
        loadingSpinner.classList.remove('hidden');
        const userMessage = document.createElement('div');
        userMessage.className = 'alert alert-secondary';
        userMessage.innerText = userInput;
        responseOutput.appendChild(userMessage);
        responseOutput.scrollTop = responseOutput.scrollHeight;

        if (!apiKey) {
            alert('Please enter your API key.');
            return;
        }

        // Append ABC notation to the user input
        if (!abcNotation) {
            alert('ABC notation is missing!');
            return;
        }

        if (selectedMode === 'chat') {
            var fullMessage = `[Role] You are a helpful music education assistant that will support beginners in reading music sheet.\n[Requirement] You are required to perform one action ONLY upon query, based on the inputted music sheet in ABC notation and student query. You must output concise and precise text answers and avoid additional output such as "Sure" or "Based on your input". You must make sure the music notations in your output are presented in a pleasant format and good for beginers to read. Never directly output music notation in ABC as student cannot understand it.\n[Action] chat based on music sheet\n[Output Format] <direct text output>\n\nMusic sheet: \n${abcNotation}\n\nQuery: \n${userInput}`;
        } else {
            var fullMessage = `[Role] You are a helpful music education assistant that will support beginners in reading music sheet.\n[Requirement] You are required to perform one action ONLY upon query, based on the inputted music sheet in ABC notation and student query. You must output concise and precise text answers and avoid additional output such as "Sure" or "Based on your input". You must make sure the music notations in your output are presented in a pleasant format and good for beginers to read.\n[Action] edit the ABC music sheet\n[Output Format] <edited ABC music sheet ONLY in WHOLE>\n\nMusic sheet: ${abcNotation}\n\nQuery: ${userInput}`;
        }
        // alert(selectedMode)
        // alert(fullMessage)

        $.ajax({
            url: 'https://api.xty.app/v1/chat/completions',
            type: 'POST',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            data: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: fullMessage }],
                stream: false,
                temperature: 0.7
            }),
            success: function(response) {
                const content = response.choices[0].message.content;
                chatHistory.push({ sender: 'LLM', message: content });
                const responseMessage = document.createElement('div');
                responseMessage.className = 'alert alert-primary';
                responseMessage.innerText = content;
                responseOutput.appendChild(responseMessage);
                responseOutput.scrollTop = responseOutput.scrollHeight;
                loadingSpinner.classList.add('hidden');
            },
            error: function(xhr, status, error) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'alert alert-danger';
                errorMessage.innerText = `Error communicating with API: ${error}`;
                responseOutput.appendChild(errorMessage);
            }
        });
        document.getElementById('user-input').value = '';
        responseOutput.scrollTop = responseOutput.scrollHeight;
    }
}

document.getElementById('submit-btn').addEventListener('click', sendMessage);

document.getElementById('user-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleSuggestions');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    toggleButton.addEventListener('click', async () => {
        loadingSpinner.classList.remove('hidden');
        const questions = await fetchQuestions();
    });
});

async function fetchQuestions() {
    const abcNotation = document.getElementById('abc-input').value.trim();
    const suggestionsDiv = document.getElementById('suggestions');
    const loadingSpinner = document.getElementById('loadingSpinner');

    var fullMessage = `[Role] You are a helpful music education assistant that will support begineer student in understanding music sheet.\n[Requirement] You are required to generate one SIMPLE question ONLY which begineer student might commly ask, such as "what is the time signature" and "what is the key signature". You must output concise and simple question and avoid any extra output.\n[Action] derive one question that beginner may ask regarding the music sheet\n[Output Format] <one question ONLY, no extra output>`;
    $.ajax({
        url: 'https://api.xty.app/v1/chat/completions',
        type: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        data: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: fullMessage }],
            stream: false,
            temperature: 1.0
        }),
        success: function(response) {
            const question = response.choices[0].message.content;
            const suggestionsList = document.querySelector('#suggestions ul');
            suggestionsList.innerHTML = '';
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = question;
            link.onclick = () => setQuestion(question);
            listItem.appendChild(link);
            suggestionsList.appendChild(listItem);
            suggestionsDiv.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
            }
    });
}


function setQuestion(question) {
    document.getElementById('user-input').value = question;
    document.getElementById('suggestions').classList.add('hidden');
}

function getKeyFromName(noteName) {
    const abcToDataNoteMap = {
        'C,,': 'C1',
        '^C,,': 'Db1',
        '_D,,': 'Db1',
        '=D,,': 'D1',
        'D,,': 'D1',
        '^D,,': 'Eb1',
        '_E,,': 'Eb1',
        '=E,,': 'E1',
        'E,,': 'E1',
        'F,,': 'F1',
        '^F,,': 'Gb1',
        '_G,,': 'Gb1',
        '=G,,': 'G1',
        'G,,': 'G1',
        '^G,,': 'Ab1',
        '_A,,': 'Ab1',
        '=A,,': 'A1',
        'A,,': 'A1',
        '^A,,': 'Bb1',
        '_B,,': 'Bb1',
        '=B,,': 'B1',
        'B,,': 'B1',

        'C,': 'C2',
        '^C,': 'Db2',
        '_D,': 'Db2',
        '=D,': 'D2',
        'D,': 'D2',
        '^D,': 'Eb2',
        '_E,': 'Eb2',
        '=E,': 'E2',
        'E,': 'E2',
        'F,': 'F2',
        '^F,': 'Gb2',
        '_G,': 'Gb2',
        '=G,': 'G2',
        'G,': 'G2',
        '^G,': 'Ab2',
        '_A,': 'Ab2',
        '=A,': 'A2',
        'A,': 'A2',
        '^A,': 'Bb2',
        '_B,': 'Bb2',
        '=B,': 'B2',
        'B,': 'B2',

        'C': 'C3',
        '^C': 'Db3',
        '_D': 'Db3',
        '=D': 'D3',
        'D': 'D3',
        '^D': 'Eb3',
        '_E': 'Eb3',
        '=E': 'E3',
        'E': 'E3',
        'F': 'F3',
        '^F': 'Gb3',
        '_G': 'Gb3',
        '=G': 'G3',
        'G': 'G3',
        '^G': 'Ab3',
        '_A': 'Ab3',
        '=A': 'A3',
        'A': 'A3',
        '^A': 'Bb3',
        '_B': 'Bb3',
        '=B': 'B3',
        'B': 'B3',

        'c': 'C4',
        '^c': 'Db4',
        '_d': 'Db4',
        '=d': 'D4',
        'd': 'D4',
        '^d': 'Eb4',
        '_e': 'Eb4',
        '=e': 'E4',
        'e': 'E4',
        'f': 'F4',
        '^f': 'Gb4',
        '_g': 'Gb4',
        '=g': 'G4',
        'g': 'G4',
        '^g': 'Ab4',
        '_a': 'Ab4',
        '=a': 'A4',
        'a': 'A4',
        '^a': 'Bb4',
        '_b': 'Bb4',
        '=b': 'B4',
        'b': 'B4',

        'c\'': 'C5',
        '^c\'': 'Db5',
        '_d\'': 'Db5',
        '=d\'': 'D5',
        'd\'': 'D5',
        '^d\'': 'Eb5',
        '_e\'': 'Eb5',
        '=e\'': 'E5',
        'e\'': 'E5',
        'f\'': 'F5',
        '^f\'': 'Gb5',
        '_g\'': 'Gb5',
        '=g\'': 'G5',
        'g\'': 'G5',
        '^g\'': 'Ab5',
        '_a\'': 'Ab5',
        '=a\'': 'A5',
        'a\'': 'A5',
        '^a\'': 'Bb5',
        '_b\'': 'Bb5',
        '=b\'': 'B5',
        'b\'': 'B5',

        'c\'\'': 'C6',
        '^c\'\'': 'Db6',
        '_d\'\'': 'Db6',
        '=d\'\'': 'D6',
        'd\'\'': 'D6',
        '^d\'\'': 'Eb6',
        '_e\'\'': 'Eb6',
        '=e\'\'': 'E6',
        'e\'\'': 'E6',
        'f\'\'': 'F6',
        '^f\'\'': 'Gb6',
        '_g\'\'': 'Gb6',
        '=g\'\'': 'G6',
        'g\'\'': 'G6',
        '^g\'\'': 'Ab6',
        '_a\'\'': 'Ab6',
        '=a\'\'': 'A6',
        'a\'\'': 'A6',
        '^a\'\'': 'Bb6',
        '_b\'\'': 'Bb6',
        '=b\'\'': 'B6',
        'b\'\'': 'B6',

        'c\'\'\'': 'C7',
        '^c\'\'\'': 'Db7',
        '_d\'\'\'': 'Db7',
        '=d\'\'\'': 'D7',
        'd\'\'\'': 'D7',
        '^d\'\'\'': 'Eb7',
        '_e\'\'\'': 'Eb7',
        '=e\'\'\'': 'E7',
        'e\'\'\'': 'E7',
        'f\'\'\'': 'F7',
        '^f\'\'\'': 'Gb7',
        '_g\'\'\'': 'Gb7',
        '=g\'\'\'': 'G7',
        'g\'\'\'': 'G7',
        '^g\'\'\'': 'Ab7',
        '_a\'\'\'': 'Ab7',
        '=a\'\'\'': 'A7',
        'a\'\'\'': 'A7',
        '^a\'\'\'': 'Bb7',
        '_b\'\'\'': 'Bb7',
        '=b\'\'\'': 'B7',
        'b\'\'\'': 'B7'
    };
    
    return abcToDataNoteMap[noteName];
}