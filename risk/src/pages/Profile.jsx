import { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { loginUser, updateUser, fetchAvatars } from '../services/api';
import { useNavigate } from 'react-router-dom';
import styles from './styles/Profile.module.css'; // Estilos separados

function Profile() {
    const user = useGameStore((s) => s.user);
    const login = useGameStore((s) => s.login);

    // Estados locals per al fornulari del perfil
    const [firstName, setFirstName] = useState(user.firstName ?? '');
    const [lastName, setLastName] = useState(user.lastName ?? '');
    const [email, setEmail] = useState(user.email ?? '');
    const [currentPassword, setCurrentPassword] = useState(''); 
    const [newPassword, setNewPassword] = useState('');
    const [avatarId, setAvatarId] = useState(user.avatar.id ?? '');

    // Avatars
    const [avatars, setAvatars] = useState([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState(user?.avatar?.id ?? '');
    const [loadingAvatars, setLoadingAvatars] = useState(false);

    // Estat per errors
    const [errorMessage, setErrorMessage] = useState('');

    const navigate = useNavigate();

    // Carreguem els avatars al entrar al component o carregarlo
    useEffect(() => {
        setLoadingAvatars(true);
        const loadAvatars = async () => {
            try {
                const data = await fetchAvatars();
                setAvatars(data);
            } catch (err) {
                console.error('Error carregant avatars:', err);
                setErrorMessage('Error al carregar avatars');
            } finally {
                setLoadingAvatars(false);
            }
        };
        loadAvatars();
    }, []);

    // Submit del formulari de perfil
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        try {
            await loginUser({ username: user.username, password: currentPassword });

            const updatedUser = {
                firstName,
                lastName,
                email,
                username: user.username,
                currentPassword,
                newPassword: newPassword || undefined,
                avatarId,
            };

            const response = await updateUser(updatedUser);
            login(response);
            alert('Perfil actualitzat correctament');
        } catch (error) {
            console.error(error.message);
            // Si es un 401 → password incorrecta
            if (error.message.includes('401')) {
                setErrorMessage('Contrasenya incorrecta!');
            } else {
                setErrorMessage(error.message);
            }
        }
    };

    const handleBack = () =>
    {
        window.history.back();
    }

    return (
        <div className={styles.authContainer}>
            <div className={styles.authBox}>
                <h2 className={styles.authTitle}>Editar perfil</h2>
                <form onSubmit={handleSubmit} className={styles.authForm}>
                    {/* Inputs perfil */}
                    <input type="text" placeholder="Nom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={styles.authInput} />
                    <input type="text" placeholder="Cognom" value={lastName} onChange={(e) => setLastName(e.target.value)} className={styles.authInput} />
                    <input type="email" placeholder="Correu electrònic" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.authInput} />
                    <input type="password" placeholder="Contrasenya actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={styles.authInput} />
                    <input type="password" placeholder="Nova contrasenya (opcional)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.authInput} />

                    {/* Avatares visuales */}
                    <div className={styles.avatarContainer}>
                        <label className={styles.avatarLabel}>Tria el teu avatar:</label>
                        {loadingAvatars ? (
                            <div className={styles.avatarLoadingContainer}>
                                <div className={styles.avatarLoadingSpinner}></div>
                                <p className={styles.avatarLoadingText}>Carregant avatars...</p>
                            </div>
                        ) : (
                            <div className={styles.avatarGrid}>
                                {avatars.map((avatar) => (
                                    <div key={avatar.id} onClick={() => { setSelectedAvatarId(avatar.id); setAvatarId(avatar.id); }} className={`${styles.avatarItem} ${selectedAvatarId === avatar.id ? styles.avatarItemSelected : ''}`}>
                                        <img src={avatar.url} alt={avatar.name} className={styles.avatarImage} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit" className={styles.submitButton}>
                        Actualitzar perfil
                    </button>

                    <button type="button" onClick={handleBack} className={styles.submitButton} style={{ backgroundColor: '#888', marginTop: '10px' }}>
                        Tornar enrere
                    </button>

                    {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
                </form>
            </div>
        </div>
    );
}

export default Profile;