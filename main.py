from flask import Flask, render_template, request, redirect, url_for, flash
from flask_socketio import SocketIO, emit, send
import os

database = []
sfulist= []

con = Flask(__name__)
#con.secretKey = os.environ.get('Secret_Key')
socket = SocketIO(con)

@con.errorhandler(404)
def errpage(e):
    return render_template('error.html')

@con.route('/about')
def about():
    return render_template('about.html')

@con.route('/')
@con.route('/home')
def home():
    return render_template('home.html')

@con.route('/sfu')
def sfupage():
    return render_template('sfu.html')

@socket.on_error_default
def default_error_handler(e):
    print(str(e))

@socket.on('Credentials')
def Credentials(credential_json):
    if(credential_json['creator'] == True): # if signing IN
        for i in database:
            if i['username'] == credential_json['username']:
                emit('flashing', {'messageid':2, 'message':'Username already exists!'})
                break
        else:
            sid = request.sid
            print(credential_json['username'], 'Joined & Password: ', credential_json['password'], 'Session_ID:', sid)
            database.append({'username': credential_json['username'],
                            'password': credential_json['password'], 'sessionid': sid})
            emit('flashing', {'messageid':1, 'message':'Added!'})
        
    else: # if Joining a meeting
        for i in database:
            if i['username'] == credential_json['username']:
                if i['password'] == credential_json['password']:
                    whom = i['sessionid']
                    emit('Credentials', whom, room = request.sid)
                    break
        else:
            emit('flashing', {'messageid':3, 'message':'No such concurrent Meeting'})

@socket.on('whatsmysid')
def sid():
    sid = request.sid
    emit('yoursidis', {'sid': sid}, room = sid)

@socket.on('declined')
def declined(message):
    sid = request.sid
    for i in database:
        if i['sessionid'] == sid:
            emit('flashing', {'messageid':4, 'from': i['username'], 'id' : sid ,'message': ', Declined the call!'}, room= message['to'])
            break

@socket.on('offer')
def sendoffer(mess):
    sid = request.sid
    for i in database:
        if i['sessionid'] == sid:
            clientname = i['username']
            break
    emit('offer', {'name': clientname, 'callerid': sid, 'message': mess['message']}, room = mess['to'])

@socket.on('offer+1')
def offerer(message):
    print('Expensive CALL')
    sid = request.sid
    for i in database:
        if i['sessionid'] == sid:
            clientname = i['username']
            break
    emit('offerer', {'name': clientname, 'callerid': sid, 'message': message['message'], 'more': message['more']}, room = message['to'])



@socket.on('specialofferaddthem')
def sendoffer2(message):
    sid = request.sid
    for i in database:
        if i['sessionid'] == sid:
            clientname = i['username']
            break
    print('Special Offer Sending to', message['to'])
    emit('specialofferfromflask', {'name': clientname, 'callerid': sid, 'message': message['message']}, room = message['to'])


@socket.on('answer')
def sendanswer(mess):
    sid = request.sid
    print(sid, "--> CONNECTED <--", mess['to'])
    emit('answer', {'calleeid': sid, 'message': mess['message']}, room = mess['to'])

@socket.on('candidate')
def candidate(mess):
    sidd = request.sid
    emit('candidate', {'from': sidd, 'message': mess['message']}, room = mess['to'])

@socket.on('specialoffer')
def special(message):
    emit('alsoadd', message['message'], room = message['to'])

@socket.on('connect')
def connect():
    print('Connected with: ', request.sid)

@socket.on('disconnect')
def close():
    global sfulist
    rem = request.sid
    emit('close', rem) # to room needed.
    print('Disconnection from', rem)
    if rem in sfulist:
        sfulist = []
    else:
        for i,j in enumerate(database):
            if j['sessionid'] == rem:
                database.remove(database[i])
                break

@socket.on('hangup')
def hangup(to):
    sid = request.sid
    for i in to:
        print('Hangup received From', sid, "sending to", i)
        emit('hangupreceived', sid, room = i)

@socket.on('readysfu') # from SFU page.
def sfus():
    sid = request.sid
    print('SFU id ', sid)
    sfulist.append(sid)

@socket.on('joinsfu')  # sending query to candidates to join sfu
def sfu(message):
    print('Join SFU request received.')
    for i in message['to']:
        print('Sending Query to Join SFU to ', i)
        emit('pleasejoinsfu',{'sfu': sfulist[0]}, room = i)# to members

@socket.on('offeringtosfu') # Offer making to SFU
def offersfu(message):
    sid = request.sid
    print('Offering to sfu by',sid)
    for i in database:
        if i['sessionid'] == sid:
            clientname = i['username']
            break
    emit('offertojoinsfu', {'callerid':sid, 'message': message['message'], 'name': clientname}, room = sfulist[0])#to SFU

@socket.on('heresyourlinenumber')
def mynumber(message):
    print("Sending Queue number", message['serial'] , " to", message['to'])
    emit('yourserial', {'my': message['serial']}, room = message['to'])

# @socket.on('contestents') #contestest list to add audio 
# def cont(message):
#     print('Sending Contestest from SFU to', message['to'])
#     emit('sendrequesttogetaudio', {'list': message['list'], 'from': request.sid}, room = message['to'])

# @socket.on('offerforaudiotosfu')
# def audiooffer(message):
#     print('sending AUDIO offer to sfu')
#     emit('audioofferreceived', {'message': message['message'], 'which': message['which'], 'callerid': message['myid']}, room = message['to'])

if __name__ == '__main__':
    socket.run(con, host='192.168.1.7') # for locally 
    #con.run() # for herokua m 