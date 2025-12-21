const Footer = () => {
  return (
    <footer className="bg-white w-full border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ProjectApp Anda. Semua Hak Dilindungi.
        </p>
      </div>
    </footer>
  );
};

export default Footer;