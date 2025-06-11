// src/components/ui/date-range-picker.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils" // Your shadcn/ui utility function
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
    // You can add more props for customization, like placeholder, disabled dates, etc.
}


export function DateRangePicker({
                                    className,
                                    date, // The selected date range
                                    onDateChange, // Callback when the date range changes
                                }: DateRangePickerProps) {
    // const [date, setDate] = React.useState<DateRange | undefined>({
    //   from: new Date(2022, 0, 20),
    //   to: addDays(new Date(2022, 0, 20), 20),
    // }) // Example internal state - you'll pass state via props

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal", // Changed from w-[300px] to w-full
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onDateChange} // Use the passed callback
                        numberOfMonths={2}
                        // disabled={(day) => day > new Date() || day < new Date("1900-01-01")} // Example disabled prop
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}