pragma SPARK_Mode (On);

package body Consent is
   function May_Publish (Living : Boolean; Consented : Boolean) return Boolean is
   begin
      return (not Living) or Consented;
   end May_Publish;
end Consent;
