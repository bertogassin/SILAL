pragma SPARK_Mode (On);

package body Ledger is
   function Conservation (Sum_Balances : Unit; Burned : Unit) return Boolean is
   begin
      return Sum_Balances + Burned = Total_Units;
   end Conservation;

   procedure Transfer
     (From, To     : Account_Id;
      Amount       : Unit;
      Id           : Tx_Id;
      From_Balance : in out Unit;
      To_Balance   : in out Unit;
      Seen         : in out Boolean)
   is
      pragma Unreferenced (From, To, Id);
   begin
      From_Balance := From_Balance - Amount;
      To_Balance   := To_Balance + Amount;
      Seen         := True;
   end Transfer;
end Ledger;
