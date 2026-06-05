
import { Toaster } from 'sonner';
import AppRouter from './app/router/AppRouter';

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <AppRouter />
    </>
  );
}

export default App;