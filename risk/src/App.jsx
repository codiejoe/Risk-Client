import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import useGameStore from './store/gameStore';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import Game from './pages/Game';
import './App.css';

function App()
{
	const user = useGameStore((s) => s.user);

	return (
		<div className="app-container">
			<Router>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/profile" element={user ? <Profile /> : <Home />} />
					<Route path="/create-game" element={user ? <CreateGame /> : <Home />} />
					<Route path="/join-game" element={user ? <JoinGame /> : <Home />} />
					<Route path="/game" element={user ? <Game /> : <Home />} />
				</Routes>
			</Router>
		</div>
	);
}

export default App;