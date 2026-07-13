const LoadingSpinner: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center py-20">
    <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-primary-500 border-t-transparent"></div>
  </div>
);

export default LoadingSpinner;
