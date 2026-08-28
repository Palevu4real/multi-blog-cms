import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}

const colors = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
};

export function StatsCard({ title, value, icon, color = "blue" }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={cn("p-3 rounded-full", colors[color])}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}