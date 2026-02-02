interface ActivityItemProps {
  name: string;
  amount: string;
  date: string;
  status: "Paid" | "Pending";
}

export default function ActivityItem({ name, amount, date, status }: ActivityItemProps) {
  return (
    <div className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5">
      <div>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-50">{date}, 2026</p>
      </div>
      <div className="text-right">
        <p className="text-primary font-bold text-sm">{amount}</p>
        <p className={`text-[9px] uppercase font-black ${
          status === 'Paid' ? 'text-green-400' : 'text-orange-400'
        }`}>
          {status}
        </p>
      </div>
    </div>
  );
}
