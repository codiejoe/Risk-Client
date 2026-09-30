import axios from 'axios';
import { API_URL, WS_URL } from '../config';   // adjust the relative path

export const loginUser = async ({ username, password }) =>
{
    try
    {
        const response = await axios.post(`${API_URL}/api/login`,
        { 
            username, 
            password 
        });
        return response.data; // dades de l'usuari loginat
    }
    catch (error)
    {   
        throw new Error('Error al iniciar sessió: '+ error);
    }
}

export const registerUser = async ({firstName, lastName, email, username, password, avatarId}) => 
{
    try
    {
        const response = await axios.post(`${API_URL}/api/register`, 
        {
            firstName,
            lastName,
            email,
            username,
            password,
            avatarId
        });
        return response.data;
    }
    catch (error)
    {
        throw new Error('Error al registrarse');
    }
}

export const updateUser = async ({firstName, lastName, email, username, currentPassword, newPassword, avatarId}) =>
{
    try 
    {
        const response = await axios.put(`${API_URL}/api/updateUser`, 
        {
            firstName,
            lastName,
            email,
            username,
            currentPassword,
            newPassword,
            avatarId
        });
        return response.data;
    }
    catch (error)
    {
        throw new Error('Error al actualitzar dades');
    }
}

export const fetchAvatars = async () =>
{
	try
    {
		const response = await axios.get(`${API_URL}/api/avatars`);
		return response.data;
	}
    catch (error)
    {
		throw new Error(error);
	}
};

export const fetchCountries = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/countries`);
        
        return response.data.map((country) => ({
            id: country.id,
            name: country.name.toLowerCase().replace(/ /g, '_'),
            continentId: country.continentId,
        }));
    } catch (error) {
        console.error('Error carregant paisos:', error.message);
        throw new Error('Error carregant paisos');
    }
};