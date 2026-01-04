import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useMemo } from 'react'
import { DataGrid } from '@/components/data-grid/components/data-grid'
import { useDataGrid } from '@/components/data-grid/hooks/use-data-grid'
import type { Id } from '@/../convex/_generated/dataModel'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { AnimClockIcon } from '@/lib/icons/animated-clock'
import { AnimatedHandFistIcon } from '@/lib/icons/animated-fist'

function Highlight({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'text-primary-foreground font-secondary italic tracking-wider',
        className,
      )}
    >
      {children}
    </span>
  )
}

interface ProgramRow {
  _id: Id<'programRows'>
  _creationTime: number
  order: number
  exerciseName: string
  libraryNotes?: string
  weight: string
  reps: string
  sets: string
  effort?: string
  rest?: string
  notes: string
  groupId?: string
}

interface Day {
  _id: Id<'days'>
  _creationTime: number
  dayLabel: string
  order: number
  rows: ProgramRow[]
}

interface Program {
  _id: Id<'programs'>
  _creationTime: number
  name: string
  days: Day[]
}

interface ProgramLinkData {
  _id: Id<'programLinks'>
  _creationTime: number
  userId: Id<'users'>
  clientId: Id<'users'>
  programId: Id<'programs'>
  trainerNotes: string
  clientProfile: {
    name: string
    image?: string
  }
  program: Program
}

type ExerciseRow = {
  _id: Id<'programRows'>
  clientId: string
  exerciseName: string
  weight: string
  reps: string
  sets: string
  effort: string
  rest: string
  notes: string
}

export function ProgramLinkDisplay({ link }: { link: ProgramLinkData }) {
  const { clientProfile } = link
  const [first] = clientProfile.name.split(' ')
  const numDays = link.program.days.length

  return (
    <div className="flex items-start justify-center leading-none">
      <div className="max-w-4xl w-full sm:m-16 px-4 pt-4 pb-12 sm:py-24 sm:px-24 sm:border sm:rounded-md space-y-12">
        {/* <div className="mb-12 flex flex-col items-center gap-6"> */}
        {/* <div> */}
        {/*   {clientProfile.image ? ( */}
        {/*     <img */}
        {/*       src={clientProfile.image} */}
        {/*       alt={clientProfile.name} */}
        {/*       className="h-32 w-32 rounded-full object-cover" */}
        {/*     /> */}
        {/*   ) : ( */}
        {/*     <div className="h-32 w-32 rounded-full bg-neutral-800 flex items-center justify-center"> */}
        {/*       <span className="text-3xl font-semibold text-muted-foreground"> */}
        {/*         {clientProfile.name */}
        {/*           .split(' ') */}
        {/*           .map((n) => n[0]) */}
        {/*           .join('') */}
        {/*           .toUpperCase()} */}
        {/*       </span> */}
        {/*     </div> */}
        {/*   )} */}
        {/* </div> */}
        {/* </div> */}
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-xl">
            Hey there <Highlight>{first}</Highlight>
          </h2>
          <p className="text-muted-foreground">
            Your <Highlight>custom</Highlight> training program is ready
          </p>
        </div>
        <div className="space-y-1">
          <Highlight>{link.program.name}</Highlight>
          <Separator className="my-4" />
          <div className="flex items-center text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <AnimatedHandFistIcon size={14} animateOnMount />
              {numDays} day split
            </span>
            <Separator orientation="vertical" className="mx-4" />
            <span className="inline-flex items-center gap-1 italic">
              <AnimClockIcon size={14} animateOnMount />
              Created {format(link._creationTime, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>
        {/* Program Header */}
        <div className="">
          {/* Trainer Notes */}
          {link.trainerNotes && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                Trainer Notes
              </h2>
              <p className="text-neutral-100 whitespace-pre-wrap">
                {link.trainerNotes}
              </p>
            </div>
          )}
        </div>

        {/* Days Grid */}
        <div className="flex flex-col gap-10">
          {link.program.days.map((day) => (
            <ReadOnlyDayGrid
              key={day._id}
              dayLabel={day.dayLabel}
              rows={day.rows}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ReadOnlyDayGrid({
  dayLabel,
  rows,
}: {
  dayLabel: string
  rows: ProgramRow[]
}) {
  // Transform rows to grid format (already filtered to exercises by the query)
  const exerciseRows: ExerciseRow[] = useMemo(() => {
    return rows.map((row) => ({
      _id: row._id,
      clientId: `row-${row._id}`,
      exerciseName: row.exerciseName,
      weight: row.weight,
      reps: row.reps,
      sets: row.sets,
      effort: row.effort ?? '',
      rest: row.rest ?? '',
      notes: row.notes,
    }))
  }, [rows])

  // Column definitions
  const columns = useMemo<ColumnDef<ExerciseRow>[]>(
    () => [
      {
        id: 'exerciseName',
        accessorKey: 'exerciseName',
        header: 'Exercise',
        meta: {
          simpleHeader: true,
          cell: {
            variant: 'short-text',
          },
        },
        size: 100,
        enableResizing: false,
      },
      // {
      //   id: 'weight',
      //   accessorKey: 'weight',
      //   header: 'Weight',
      //   meta: {
      //     simpleHeader: true,
      //     cell: {
      //       variant: 'short-text',
      //     },
      //   },
      //   enableResizing: false,
      // },
      {
        id: 'reps',
        accessorKey: 'reps',
        header: 'Reps',
        meta: {
          simpleHeader: true,
          cell: {
            variant: 'short-text',
          },
        },
        size: 20,
        enableResizing: false,
      },
      {
        id: 'sets',
        accessorKey: 'sets',
        header: 'Sets',
        meta: {
          simpleHeader: true,
          cell: {
            variant: 'short-text',
          },
        },
        size: 20,
        enableResizing: false,
      },
      // {
      //   id: 'effort',
      //   accessorKey: 'effort',
      //   header: 'RIR/RPE',
      //   meta: {
      //     cell: {
      //       variant: 'short-text',
      //     },
      //   },
      //   enableResizing: false,
      // },
      // {
      //   id: 'rest',
      //   accessorKey: 'rest',
      //   header: 'Rest',
      //   meta: {
      //     simpleHeader: true,
      //     cell: {
      //       variant: 'short-text',
      //     },
      //   },
      //   enableResizing: false,
      // },
      // {
      //   id: 'notes',
      //   accessorKey: 'notes',
      //   header: 'Notes',
      //   meta: {
      //     simpleHeader: true,
      //     cell: {
      //       variant: 'long-text',
      //     },
      //   },
      //   minSize: 100,
      //   enableResizing: false,
      // },
    ],
    [],
  )

  const dataGrid = useDataGrid({
    data: exerciseRows,
    enableSorting: false,
    enablePinning: false,
    columns,
    readOnly: true,
    getRowId: (row) => row.clientId,
  })

  return (
    <div className="flex flex-col gap-2 space-y-3">
      <Highlight className="">{dayLabel}</Highlight>
      <DataGrid {...dataGrid} stretchColumns />
    </div>
  )
}
