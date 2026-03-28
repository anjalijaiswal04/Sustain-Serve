export default function Dashboard({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-4">{title} Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="font-bold text-gray-500 uppercase text-sm">Stats</h3>
          <p className="text-2xl font-bold mt-2">12</p>
        </div>
      </div>
    </div>
  );
}
