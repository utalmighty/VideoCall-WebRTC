from flask import Flask, render_template, request, redirect, url_for, flash
from flask_socketio import SocketIO, emit, send
import os

database = []

con = Flask(__name__)
con.secretKey = os.environ.get('Secret_Key')
socket = SocketIO(con)


@con.errorhandler(404)
def errpage(e):
    return render_template('error.html')

@con.route('/about')
def about():
    return render_template('about.html')

@con.route('/')
def home():
    return render_template('home.html')

@socket.on_error_default
def default_error_handler(e):
    print(str(e))

@socket.on('Credentials')
def Credentials(credential_json):
    if(credential_json['creator'] == True):
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
        
    else:
        for i in database:
            if i['username'] == credential_json['username']:
                if i['password'] == credential_json['password']:
                    whom = i['sessionid']
                    emit('Credentials', whom, room = request.sid)
                    break
        else:
            emit('flashing', {'messageid':3, 'message':'No such concurrent Meeting'})


@socket.on('offer')
def sendoffer(mess):
    sid = request.sid
    for i in database:
        if i['sessionid'] == sid:
            clientname = i['username']
            break
    emit('offer', {'name': clientname, 'callerid': request.sid, 'message': mess['message']}, room = mess['to'])

@socket.on('answer')
def sendanswer(mess):
    emit('answer', {'calleeid': request.sid, 'message': mess['message']}, room = mess['to'])

@socket.on('candidate')
def candidate(mess):
    sidd = request.sid
    emit('candidate', {'from': sidd, 'message': mess['message']}, room = mess['to'])

@socket.on('disconnect')
def close():
    rem = request.sid
    emit('close', rem)
    print('Disconnection from', rem)
    for i,j in enumerate(database):
        if j['sessionid'] == rem:
            database.remove(database[i])
            break

if __name__ == '__main__':
    socket.run(con, debug = True) # for locally , host='192.168.1.9'
    #con.run() # for heroku