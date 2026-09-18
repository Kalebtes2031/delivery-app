import { Platform } from 'react-native';

const API_URL = Platform.select({
    // android: 'https://vivacious-pedigree-reissue.ngrok-free.dev/api/v1',
    // android: 'http://192.168.1.3:8000/api/v1',
    // android: 'http://192.168.100.51:8000/api/v1',
    // android: 'https://backend-qine.activetechet.com/api/v1',
    // ios: 'https://backend-qine.activetechet.com/api/v1',
    default: 'https://backend.elilitapp.com/api/v1',
});

export default {
    API_URL,
};
