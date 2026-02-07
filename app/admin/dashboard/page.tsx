import {LogoutButton} from "@/app/components/ui/LogoutButton";
import CreateTeamForm from "@/app/features/teams/CreateTeamAction";

export default function AdminHome(){
    return (
        <>
            <h1>Admin Dashboard</h1>
            <LogoutButton></LogoutButton>
            <CreateTeamForm></CreateTeamForm>
        </>
    )
}