const config = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };

const peerConnections = {};
contestents = [];
maximumparties = 2; // Means Only two Peer can be connected(Excluding yourself)

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
    document.getElementById('joiningbuttonid').disabled = false;
    document.getElementById('joiningbuttonid').textContent = 'Connect';
    const remoteVideo = document.createElement('video');
    document.getElementById('camera').style.display = 'none';
    document.getElementById('screen').style.display = 'none';
    remoteVideo.srcObject = stream;
    remoteVideo.setAttribute("id", id.replace(/[^a-zA-Z]+/g, "").toLowerCase());
    remoteVideo.setAttribute("playsinline", "true");
    remoteVideo.setAttribute("autoplay", "true");
    remoteVideos.appendChild(remoteVideo);
    localVideo.style.right = '4px';
    localVideo.style.bottom = '4px';
    localVideo.style.width = '100px';
    localVideo.style.margin = '10px';
    localVideo.style.height = '75px';
    localVideo.style.position = 'relative';
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
}


function muteunmute(track, mvalue){// track='a' or 'v', True= Unmute, False = Mute
    if (track == 'a'){
        if(mvalue == true){
        document.getElementById('unmutemicid').style.display = 'block';
        document.getElementById('mutemicid').style.display = 'none';
        }
        else{
            document.getElementById('unmutemicid').style.display = 'none';
            document.getElementById('mutemicid').style.display = 'block';
        }
        localVideo.srcObject.getAudioTracks()[0].enabled = mvalue;
    }
    else{
        if(mvalue == true){
            document.getElementById('unmutevidid').style.display = 'block';
            document.getElementById('mutevidid').style.display = 'none';
            }
            else{
                document.getElementById('unmutevidid').style.display = 'none';
                document.getElementById('mutevidid').style.display = 'block';
                }
        localVideo.srcObject.getVideoTracks()[0].enabled = mvalue;
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
    if (mess['messageid'] == 3){
        document.getElementById('joiningbuttonid').disabled = false;
        document.getElementById('joiningbuttonid').textContent = 'Connect';
        alert(mess['message']);
    }
    else if (mess['messageid'] == 4){
        document.getElementById('joiningbuttonid').disabled = false;
        document.getElementById('joiningbuttonid').textContent = 'Connect';
        alert(mess['from']+' '+mess['message']);
    } 
    else{
        alert(mess['message']);
    }
})


function sendjoin(){ // to send Join request
    username = document.getElementById('joinusernameid').value;
    password = document.getElementById('joinpasswordid').value;
    if(username == document.getElementById('usernameid').value){
        alert('You can not call yourself!');
    }
    else if (username.length == 0 || password.length == 0){
        alert('Enter username or password!');
    }
    else if(contestents.length < maximumparties){
        document.getElementById('joiningbuttonid').disabled = true;
        socket.emit('Credentials', {'creator':false, 'username': username, 'password':password});
    }
    else{
        alert('Maximum number of candidates limited to: ' + maximumparties);
    }
}


socket.on('Credentials', function(calleesid){// once server checks up for the opposite peer on its database server sends back Session ID of other person
    makeoffer(calleesid); // offer make function is called
});

function makeoffer(calleesid){ // offer making
    document.getElementById('joiningbuttonid').textContent = 'Calling.';
    const peerConnection = new RTCPeerConnection(config); //write config in (). //RTCPeerConnection Object is created.
    peerConnections[calleesid] = peerConnection;
    peerConnection.addStream(localVideo.srcObject);
    peerConnection.createOffer() // Offer is Created(Promise based)
    .then(sdp => peerConnection.setLocalDescription(sdp))//SDP: Session Discription Protocol: it contains many information of Peer.
    .then(function(){
        console.log('Number of Contestents', contestents.length);
        if (contestents.length>0){
            socket.emit('offer+1', {'to': calleesid, 'message': peerConnection.localDescription, 'more': contestents});
        }
        else{
        socket.emit('offer', {'to':calleesid, 'message': peerConnection.localDescription}); // offer is emited through socket to server and server will send to calleesid
        }
    });
    peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, calleesid);
    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit('candidate', {'to': calleesid, 'message':event.candidate});
        }
    };
}

socket.on('offer', function(message){// if offer is received
    if(confirm(message['name']+ " Calling. Accept?")){
        const peerConnection = new RTCPeerConnection(config);
        contestents[contestents.length] = message['callerid'];
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
        if (contestents.length > 1){
            addmore(message['callerid']);
        }
    }
    else{
        socket.emit('declined', {'to': message['callerid']});
    }  
})

socket.on('offerer', function(message){// offer with more than one candidate.
    if(confirm(message['name']+ " Calling (with more than one participants). Accept? ")){
        const peerConnection = new RTCPeerConnection(config);
        contestents[contestents.length] = message['callerid'];
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
        offeringtothem(message['more']);
    }
    else{
        socket.emit('declined', {'to': message['callerid']});
    }
})


socket.on('alsoadd', function(message){
    offeringtothem(message);
});

function offeringtothem(message){
    for (i=0; i<message.length; i++){
        xp = message[i];
        const peerConnection = new RTCPeerConnection(config); //write config in (). //RTCPeerConnection Object is created.
        contestents[contestents.length] = message[i];
        peerConnections[message[i]] = peerConnection;
        peerConnection.addStream(localVideo.srcObject);
        peerConnection.createOffer() // Offer is Created(Promise based)
        .then(sdp => peerConnection.setLocalDescription(sdp))//SDP: Session Discription Protocol: it contains many information of Peer.
        .then(function(){
            socket.emit('specialofferaddthem', {'to': xp, 'message': peerConnection.localDescription}); // offer is emited through socket to server and server will send to calleesid
        });
        peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, xp);
        peerConnection.onicecandidate = function(event) {
            if (event.candidate) {
            socket.emit('candidate', {'to': message[i], 'message':event.candidate});
            }
        };
    }
}

socket.on('specialofferfromflask', function(message){ 
        const peerConnection = new RTCPeerConnection(config);
        contestents[contestents.length] = message['callerid'];
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
})

socket.on('candidate', function(mess){
    peerConnections[mess['from']].addIceCandidate(new RTCIceCandidate(mess['message']))
    .catch(e => console.error(e));
});

socket.on('close', function(){// closing the peer-peer connection
    peerConnection.close();
})

socket.on('answer', function(message){
    document.getElementById('joiningbuttonid').textContent = 'Connect';
    document.getElementById('joiningbuttonid').disabled = false;
    document.getElementById('joinusernameid').value = '';
    document.getElementById('joinpasswordid').value = '';
    contestents[contestents.length] = message['calleeid'];
    peerConnections[message['calleeid']].setRemoteDescription(message['message']);
});

function addmore(receiver){
    x = contestents;
    socket.emit('specialoffer', {'to': receiver, 'message': x.slice(0,x.length-1)})
}

  socket.on('close', function(id){
      handleRemoteHangup(id)
  })

  function hangup(){
    for(i=0; i<contestents.length;i++){
      document.querySelector("#" + contestents[i].replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
    }
    if (remoteVideos.querySelectorAll("video").length === 1) {
      remoteVideos.setAttribute("class", "one remoteVideos");
    } else {
      remoteVideos.setAttribute("class", "remoteVideos");
    }
    socket.emit('hangup', contestents);
    contestents = [];
}

socket.on('hangupreceived', function(from){
    handleRemoteHangup(from);
})

  function handleRemoteHangup(id) {
    console.log('me');
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