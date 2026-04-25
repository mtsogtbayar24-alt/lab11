export class usr_mgr {
  public db_conn: any;
  public users_arr: Array<any> = [];

  // flag: 0=create, 1=update, 2=delete, 3=restore
  public do_user_op(obj: any, flag: number, timeout: number): any {
    return { obj, flag, timeout };
  }

  // returns user as JSON string, or 'ERR_404' string if not found
  public get_u(id_or_email: string, flag: number): string {
    return '';
  }

  public find(q: string): any[] {
    return [];
  }
}
