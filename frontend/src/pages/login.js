import LoginForm from "../components/auth/LoginForm";

export default function Login() {
  return (
    <div className="min-h-screen dark:bg-dark_bg_1 flex items-center justify-center py-4 px-3 sm:px-6 overflow-y-auto">
      {/*Container*/}
      <div className="flex w-full max-w-[1600px] mx-auto h-full">
        {/*Login Form */}
        <LoginForm />
      </div>
    </div>
  );
}
