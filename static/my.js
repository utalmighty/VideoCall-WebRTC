const config = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };

const peerConnections = {};

const constraints = { // media devices constraints
    audio:true,
    video: {width: {min: 320, max: 640}, height: {min: 240, max: 480}, frameRate: {max: 15}}
};

const localVideo = document.querySelector('.localVideo');
const remoteVideos = document.querySelector('.remoteVideos');
socket=io.connect();//default domain- starting socket connection between server(flask) and client


navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream){ // if success in getting media devices
    localVideo.srcObject = stream;// adding stream to video Element
})
.catch(error => console.log(error));

function handleRemoteStreamAdded(stream, id){
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = stream;
    remoteVideo.setAttribute("id", id.replace(/[^a-zA-Z]+/g, "").toLowerCase());
    remoteVideo.setAttribute("playsinline", "true");
    remoteVideo.setAttribute("autoplay", "true");
    remoteVideos.appendChild(remoteVideo);
    localVideo.style.right = '4px';
    localVideo.style.bottom = '4px';
    localVideo.style.width = '100px';
    localVideo.style.height = '75px';
    localVideo.style.position = 'relative';
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
}


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
    console.log('Creating Offer');
    makeoffer(calleesid); // offer make function is called
});

function makeoffer(calleesid){ // offer making
    const peerConnection = new RTCPeerConnection(config); //write config in (). //RTCPeerConnection Object is created.
    peerConnections[calleesid] = peerConnection;
    peerConnection.addStream(localVideo.srcObject);
    peerConnection.createOffer() // Offer is Created(Promise based)
    .then(sdp => peerConnection.setLocalDescription(sdp))//SDP: Session Discription Protocol: it contains many information of Peer.
    .then(function(){
        socket.emit('offer', {'to':calleesid, 'message': peerConnection.localDescription}); // offer is emited through socket to server and server will send to calleesid
    });
    console.log('calling in next');
    peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, calleesid);
    console.log('called previously');
    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit('candidate', {'to': calleesid, 'message':event.candidate});
        }
    };
}

socket.on('offer', function(message){// if offer is received
    if(confirm(message['name']+ " Calling. Accept?")){
        const peerConnection = new RTCPeerConnection(config);
        peerConnections[message['callerid']] = peerConnection // write config in ()
        peerConnection.addStream(localVideo.srcObject); 
        peerConnection.setRemoteDescription(message['message']) // Remember Local Description and SDP is send throungh the sockets
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(function(){// if was here initially.
            socket.emit('answer', {'to': message['callerid'], 'message': peerConnection.localDescription});
        });
        peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, message['callerid']);
        peerConnection.onicecandidate = function(event) {
            if (event.candidate) {
                socket.emit('candidate', {'to': message['callerid'], 'message':event.candidate});
            }
        };
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
    console.log('Answer received');
    peerConnections[message['calleeid']].setRemoteDescription(message['message']);
});



  socket.on('close', function(id){
      handleRemoteHangup(id)
  })

  function handleRemoteHangup(id) {
    peerConnections[id] && peerConnections[id].close();
    delete peerConnections[id];
    document.querySelector("#" + id.replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
  }

  function screenshare(){
    document.getElementById('camera').style.display = 'block';
    document.getElementById('screen').style.display = 'none';
    navigator.mediaDevices.getDisplayMedia({video: true})
    .then(function(stream){ // if success in getting media devices
        localVideo.srcObject = stream;// adding stream to video Element
    })
    .catch(error => console.log(error));
}

function camera(){
    document.getElementById('camera').style.display = 'none';
    document.getElementById('screen').style.display = 'block';
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){ // if success in getting media devices
        localVideo.srcObject = stream;// adding stream to video Element
    })
    .catch(error => console.log(error));
}

  window.onunload = window.onbeforeunload = function() {
    socket.close();
  };