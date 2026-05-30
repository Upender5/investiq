import { useEffect } from 'react';
import { router } from 'expo-router';
import { auth } from '../lib/auth';
import LoadingScreen from '../components/LoadingScreen';

export default function Index() {
  useEffect(() => {
    (async () => {
      const loggedIn = await auth.isLoggedIn();
      if (loggedIn) {
        router.replace('/(app)/home');
      } else {
        router.replace('/(auth)/login');
      }
    })();
  }, []);

  return <LoadingScreen message="Starting InvestIQ..." />;
}
