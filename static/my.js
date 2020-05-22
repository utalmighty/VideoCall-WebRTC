const config = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };// To Ice candidate urls

const peerConnections = {};

const constraints = { // media devices constraints
    audio:true,
    video: {width: {min: 320, max: 640}, height: {min: 240, max: 480}, frameRate: {max: 15}}
};

video = document.getElementById('webcam');
remotevid = document.getElementById('remote');
//quality=4; // lower is better, range 0.0 to 1.0(as from web)
//fpstosend = 10;
socket=io.connect();//default domain- starting socket connection between server(flask) and client


navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream){ // if success in getting media devices
    video.srcObject = stream;// adding stream to video Element
})
.catch(error => console.log(error));



function sendcred(){
    username = document.getElementById('usernameid').value;
    password = document.getElementById('passwordid').value;
    if (username.length > 0 && password.length > 0){
        socket.emit('Credentials', {'creator':true, 'username': username, 'password':password}); // Sending Cred to server
    }
    else{
        alert('Username or Password can not be null!');
    }
}

socket.on('flashing', function(mess){ // Once server checks up for username and password it sends message which is displayed as alert
    alert(mess['message']);
})


function sendjoin(){ // to send Join request
    username = document.getElementById('joinusernameid').value;
    password = document.getElementById('joinpasswordid').value;
    if(username == document.getElementById('usernameid').value){
        alert('You can not call yourself!')
    }
    else if (username.length == 0 || password.length == 0){
        alert('Enter username or password!');
    }
    else{
    socket.emit('Credentials', {'creator':false, 'username': username, 'password':password});
    }
}


socket.on('Credentials', function(calleesid){// once server checks up for the opposite peer on its database server sends back Session ID of other person
    makeoffer(calleesid); // offer make function is called
})

function makeoffer(calleesid){ // offer making
    const peerConnection = new RTCPeerConnection(config); //write config in (). //RTCPeerConnection Object is created.
    peerConnections[calleesid] = peerConnection;
    let stream = video.srcObject; // stream to be send(video), its source object is copied
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream)); // specifies tracks from stream to be send.
    peerConnection.createOffer() // Offer is Created(Promise based)
    .then(sdp => peerConnection.setLocalDescription(sdp))//SDP: Session Discription Protocol: it contains many information of Peer.
    .then(function(){
        socket.emit('offer', {'to':calleesid, 'message': peerConnection.localDescription}); // offer is emited through socket to server and server will send to calleesid
    })
    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit('candidate', {'to': calleesid, 'message':event.candidate});
        }
    };
    peerConnection.ontrack = function(event){ //it specifies the tracts to be send 
        remotevid.srcObject = event.streams[0];
        moveTocorner();
    }
}


socket.on('offer', function(message){// if offer is received
        peerConnection = new RTCPeerConnection(config); // write config in ()
        let stream = video.srcObject; // source object of video of comming connection is set
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        peerConnection.setRemoteDescription(message['message']) // Remember Local Description and SDP is send throungh the sockets
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(function(){// if was here initially.
        if(confirm('Accept?')){
            socket.emit('answer', {'to': message['callerid'], 'message': peerConnection.localDescription});
        }
        });
        peerConnection.onicecandidate = function(event) {
            if (event.candidate) {
              socket.emit('candidate', {'to': message['callerid'], 'message':event.candidate});
            }
        };
        peerConnection.ontrack = function(event){
            remotevid.srcObject = event.streams[0];
            moveTocorner();
        }
})

socket.on('candidate', function(mess){
    peerConnections[mess['from']].addIceCandidate(new RTCIceCandidate(mess['message']))
    .catch(e => console.error(e));
});

socket.on('close', function(){// closing the peer-peer connection
    peerConnection.close();
})

socket.on('answer', function(message){
    peerConnections[message['calleeid']].setRemoteDescription(message['message']);
});

function screenshare(){
    document.getElementById('camera').style.display = 'block';
    document.getElementById('screen').style.display = 'none';
    video.style.width = "75%";
    video.style.height = "50%";
    navigator.mediaDevices.getDisplayMedia({video: true})
    .then(function(stream){ // if success in getting media devices
        video.srcObject = stream;// adding stream to video Element
    })
    .catch(error => console.log(error));
}

function camera(){
    document.getElementById('camera').style.display = 'none';
    document.getElementById('screen').style.display = 'block';
    video.style.width = "40%";
    video.style.height = "30%";
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){ // if success in getting media devices
        video.srcObject = stream;// adding stream to video Element
    })
    .catch(error => console.log(error));
}

function moveTocorner(){
    document.getElementById('camera').style.display = 'none';
    document.getElementById('screen').style.display = 'none';
    video.style.right = '4px';
    video.style.bottom = '4px';
    video.style.width = '100px';
    video.style.height = '75px';
    video.style.position = 'relative';
    remotevid.style.width = 'auto';
    remotevid.style.height = 'auto'; 
}