pragma SPARK_Mode (On);

package body Bank is

   function No_Riba return Boolean is
   begin
      return Interest_Bps = 0;
   end No_Riba;

   function No_Auto_Pay return Boolean is
   begin
      return not Auto_Insurance_Pay;
   end No_Auto_Pay;

end Bank;
