import { Target } from "lucide-react"

interface Props {
    children: React.ReactNode
  }
  
  export default function AuthLayout({ children }: Props) {
    return (
      <div className='min-h-svh bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center lg:max-w-none lg:px-0'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[480px] lg:p-8'>
          <div className='mb-8 flex flex-col items-center justify-center space-y-2'>
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Target className='h-7 w-7 text-white' />
            </div>
            <h1 className='text-2xl font-semibold text-white'>Billiards Management</h1>
            <p className="text-sm text-slate-300">Sign in to manage your billiards hall</p>
          </div>
          {children}
        </div>
      </div>
    )
  }
  