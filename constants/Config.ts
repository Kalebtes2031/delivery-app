import { Platform } from 'react-native';

const API_URL = Platform.select({
    // android: 'https://express-ethically-diary.ngrok-free.dev/api/v1',
    // android: 'http://192.168.1.2:8000/api/v1',
    android: 'https://backend-qine.activetechet.com/api/v1',
    // ios: 'https://backend-qine.activetechet.com/api/v1',
    // default: 'https://backend-qine.activetechet.com/api/v1',
});

export default {
    API_URL,
};
