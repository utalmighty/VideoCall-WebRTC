/** @type {RTCConfiguration} */
const config = { // eslint-disable-line no-unused-vars
  'iceServers': [{
    'urls': ['stun:stun.l.google.com:19302']
  }]
};

const socket = io.connect(window.location.origin);
const video = document.querySelector('video'); // eslint-disable-line no-unused-vars

window.onunload = window.onbeforeunload = function() {
	socket.close();
};


//--------------------------------------------------------------------------

const peerConnections = {};

/** @type {MediaStreamConstraints} */
const constraints = {
	// audio: true,
	video: {facingMode: "user"}
};

navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream) {
	video.srcObject = stream;
	socket.emit('broadcaster');
}).catch(error => console.error(error));

socket.on('answer', function(id, description) {
	peerConnections[id].setRemoteDescription(description);
});

socket.on('watcher', function(id) {
	const peerConnection = new RTCPeerConnection(config);
	peerConnections[id] = peerConnection;
	let stream = video.srcObject;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
	peerConnection.createOffer()
	.then(sdp => peerConnection.setLocalDescription(sdp))
	.then(function () {
		socket.emit('offer', id, peerConnection.localDescription);
	});
	peerConnection.onicecandidate = function(event) {
		if (event.candidate) {
			socket.emit('candidate', id, event.candidate);
		}
	};
});

socket.on('candidate', function(id, candidate) {
	peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('bye', function(id) {
	peerConnections[id] && peerConnections[id].close();
	delete peerConnections[id];
});



// Watch-------------------------------------------------------------------------------
let peerConnection;

socket.on('offer', function(id, description) {
	peerConnection = new RTCPeerConnection(config);
	peerConnection.setRemoteDescription(description)
	.then(() => peerConnection.createAnswer()) //creating answer
	.then(sdp => peerConnection.setLocalDescription(sdp))  
	.then(function () {
		socket.emit('answer', id, peerConnection.localDescription);
	});
	peerConnection.ontrack = function(event) {
		video.srcObject = event.streams[0];
	};
	peerConnection.onicecandidate = function(event) {
		if (event.candidate) {
			socket.emit('candidate', id, event.candidate);
		}
	};
});

socket.on('candidate', function(id, candidate) {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  .catch(e => console.error(e));
});

socket.on('connect', function() {
	socket.emit('watcher');
});

socket.on('broadcaster', function() {
  socket.emit('watcher');
});

socket.on('bye', function() {
	peerConnection.close();
});