const express = require('express');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3001;
const BACKEND = process.env.BACKEND_URL || 'https://risk-multiplayer-springboot-backend-production.up.railway.app';

app.use(cors());
app.use(express.json());

// Endpoint de login
app.post('/api/login', async (req, res) => {
	const { username, password } = req.body;

	try 
	{
		const response = await axios.post(
			`${BACKEND}/api/login`,
			{ username, password },
			{ auth: { username, password } }
		);

		console.log(`Login OK: ${username} (id: ${response.data.id})`);
		res.json(response.data);

	} 
	catch (error) 
	{
		console.error('Error login:', error.message);
		res.status(401).json({ error: "Revisa les credencials!" });
	}
});

// Endpoint de registre: proxy al Railway
app.post('/api/register', async (req, res) => {
	const { firstName, lastName, email, username, password, avatarId } = req.body;

	try 
	{
		const response = await axios.post(
			`${BACKEND}/api/users/register`,
			{ firstName, lastName, email, username, password, avatarId }
		);

		res.json(response.data);

	} 
	catch (error) 
	{
		console.error('Error register ws:', error.message);
		res.status(400).json({ error: "Error registrant usuari" });
	}
});

// Endpoint d’actualització d’usuari
app.put('/api/updateUser', async (req, res) => {
	const { firstName, lastName, email, username, currentPassword, newPassword, avatarId } = req.body;

	try 
	{
		const response = await axios.put(
			`${BACKEND}/api/users/update/${username}`,
			{ firstName, lastName, email, password: newPassword || currentPassword, avatarId },
			{ auth: { username, password: currentPassword } }
		);

		res.json(response.data);

	} 
	catch (error) 
	{
		console.error('Error updateUser del ws:', error.message);
		res.status(400).json({ error: "Error actualitzant unsuari" });
	}
});

// Endpoint d’avatars
app.get('/api/avatars', async (req, res) => {
	try {
		const response = await axios.get(`${BACKEND}/api/avatars`);
		res.json(response.data);
	} 
	catch (error) 
	{
		console.error('Error obtenir avatars:', error.message);
		res.status(500).json({ error: 'Error al obtenir avatars' });
	}
});

// Endpoint de països
app.get('/api/countries', async (req, res) => {
	try 
	{
		const response = await axios.get(`${BACKEND}/api/countries`);
		res.json(response.data);
	} 
	catch (error) 
	{
		console.error('Error obtenir continents i països:', error.message);
		res.status(500).json({ error: 'Error al obtenir continents i països' });
	}
});




// Creem servidor HTTP i WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/game' });

// Quan un client es connecta per WS
wss.on('connection', async (clientSocket, req) => {
	const url = new URL(req.url, `http://${req.headers.host}`);
	const username = url.searchParams.get('username');
	const password = url.searchParams.get('password');
	const userId = url.searchParams.get('userId');

	// Validem que tinguem credencials
	if (!username || !password || !userId)
	{
		console.error('Falten credencials');
		clientSocket.close();
		return;
	}

	console.log(`Client WS connectat per userId ${userId}`);

	try 
	{
		// Fem login al Railway per obtenir cookie de sessió
		const loginResponse = await axios.post(
			`${BACKEND}/api/login`,
			{ username, password },
			{ auth: { username, password } }
		);

		const cookie = loginResponse.headers['set-cookie'][0];
		console.log(`WS login OK per userId ${userId}`);

		// Ens connectem al WS amb la cookie
		const railwayWS = new WebSocket(
			BACKEND.replace('https://', 'wss://') + '/ws/game',
			{ headers: { Cookie: cookie } }
		);

		// Quan s’obre la connexió mostrem a consola quin usuari
		railwayWS.on('open', () =>console.log(`WS connectat per userId ${userId}`));

		// Quan rebem missatge de WS reenviem al client
		railwayWS.on('message', (message) => {
			console.log(`WEBSOCKET -> CLIENT (${userId}):`, message.toString());
			if (clientSocket.readyState === WebSocket.OPEN)
			{
				clientSocket.send(message);
			}
		});

		// Quan es tanca Railway WS → tanquem client
		railwayWS.on('close', (code, reason) => {
			console.log(`Railway WS desconnectat per userId ${userId}, code=${code}, reason=${reason}`);
			if (clientSocket.readyState === WebSocket.OPEN)
			{
				clientSocket.close();
			}
		});

		railwayWS.on('error', (err) => console.error(`WS error per userId ${userId}:`, err.message));

		// Quan el client ens envia missatges reenviem a ws
		clientSocket.on('message', (message) => {
		// Declarem msgString per evitar ReferenceError
		let msgString;

		// Comprova el tipus de missatge i el converteix a string UTF-8 segons el format, aixi sempre tenim el missatge en format texte...
		if (Buffer.isBuffer(message))
		{
			msgString = message.toString('utf-8');
		}
		else if (typeof message === 'object' && 'arrayBuffer' in message)
		{
			msgString = Buffer.from(message).toString('utf-8');
		}
		else
		{
			msgString = message.toString();
		}
		// ... i per tant el podem mostrar guai per consola
		console.log(`CLIENT -> WEBSOCKET (${userId}):`, msgString);

		if (railwayWS.readyState === WebSocket.OPEN) {
			railwayWS.send(msgString);
		}
		});

		// Quan el client es desconnecta tanquem WS
		clientSocket.on('close', (code, reason) => {
			console.log(`Client WS desconnectat per userId ${userId}, code=${code}, reason=${reason}`);
			
			if (railwayWS.readyState === WebSocket.OPEN)
			{
				railwayWS.close();
			}
		});

	}
	catch (err)
	{
		console.error('ERROR connectant Railway WS:', err.message);
		clientSocket.close();
	}
});

// Obrim servidor ak port 3001
server.listen(port, () => {
  	console.log(`Backend escoltant a http://localhost:${port} + WS Proxy Railway actiu`);
});