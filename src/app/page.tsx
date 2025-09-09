export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">THIS IS BASICALLY THE PASGE.TSK</span> 
            <span className="text-gray-900 dark:text-white"> Working! ✅</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            All systems operational - ready for portfolio development
          </p>
        </div>

        {/* Basic Colors Test */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-red-500 hover:bg-red-600 text-white p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
            <h3 className="text-xl font-bold mb-2">🔴 Basic Colors</h3>
            <p>Standard Tailwind colors working perfectly</p>
          </div>
          <div className="bg-primary-500 hover:bg-primary-600 text-white p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
            <h3 className="text-xl font-bold mb-2">🔵 Primary</h3>
            <p>Custom primary colors configured</p>
          </div>
          <div className="bg-accent-500 hover:bg-accent-600 text-white p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
            <h3 className="text-xl font-bold mb-2">🟣 Accent</h3>
            <p>Custom accent colors working</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="glass p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white">✨ Glass Effect</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Backdrop blur working</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white">🌙 Dark Mode</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Theme switching ready</p>
          </div>
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white p-4 rounded-lg">
            <h4 className="font-semibold">🎨 Gradients</h4>
            <p className="text-sm">Beautiful gradients</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border-l-4 border-primary-500">
            <h4 className="font-semibold text-gray-900 dark:text-white">📱 Responsive</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Mobile-first design</p>
          </div>
        </div>

        {/* Animation Test */}
        <div className="text-center mb-12">
          <div className="inline-block animate-float mb-4">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl">
              🚀
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Floating animation working</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">✅ Tailwind CSS v3</h3>
            </div>
            <p className="text-green-700 dark:text-green-300">Stable version installed and configured</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">🎯 Ready for Development</h3>
            </div>
            <p className="text-blue-700 dark:text-blue-300">All systems ready for portfolio components</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-x-4">
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200">
            Start Building Portfolio
          </button>
          <button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200">
            Test Components
          </button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 dark:text-gray-400">
          <p>🎉 If you can see this page styled correctly, everything is working!</p>
          <p className="mt-2 text-sm">Now you can start building your amazing portfolio components.</p>
        </div>
      </div>
    </main>
  );
}