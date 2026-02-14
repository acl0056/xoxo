using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.Components
{
    public sealed partial class FDNRParametersControl : UserControl
    {

        private FDNR SerializableFDNR { get; }
        private string oldElementName;

        public FDNRParametersControl(FDNR fdnr)
        {
            this.InitializeComponent();
            SerializableFDNR = fdnr;

            fdnr.PropertyChanged += handleChangeOfControls;

            handleChangeOfControls(null, null);
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = txtElementName.Text;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void FDNRValueChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "FdnrValue",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }
        
        private void FDNRPrecisionChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "ComponentPrecision",
                OldValue = args.oldValue,
                NewValue = args.newValue,
                CommandType = CommandType.DontCalculate
            };

            executeCommand(command);
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableFDNR.PropertyChanged -= handleChangeOfControls;
           
            componentValueBox.ValueChanged -= FDNRValueChanged;
            componentValueBox.ComponentValue = SerializableFDNR.FdnrValue;
            componentValueBox.ValueChanged += FDNRValueChanged;

            componentValueBox.PrecisionChanged -= FDNRPrecisionChanged;
            componentValueBox.ComponentPrecision = SerializableFDNR.ComponentPrecision;
            componentValueBox.PrecisionChanged += FDNRPrecisionChanged;

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableFDNR.ElementName;
            txtElementName.TextChanged += ElementNameChanged;
            
            SerializableFDNR.PropertyChanged += handleChangeOfControls;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }


        private void checkedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "OutputVoltageAcross",
                OldValue = SerializableFDNR.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "OutputVoltageAcross",
                OldValue = SerializableFDNR.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

        private void checkedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "OutputCurrentThrough",
                OldValue = SerializableFDNR.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableFDNR,
                Property = "OutputCurrentThrough",
                OldValue = SerializableFDNR.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }
    }
}
