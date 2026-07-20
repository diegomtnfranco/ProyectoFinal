// frontend/src/shared/components/layouts/Footer.tsx
const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-2 text-center text-xs text-slate-400 mt-auto">
      <p>© {new Date().getFullYear()} EstacionApp</p>
    </footer>
  );
};

export default Footer;