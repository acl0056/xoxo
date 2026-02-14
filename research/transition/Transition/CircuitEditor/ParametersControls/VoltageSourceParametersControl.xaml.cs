using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Functions;
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
    public sealed partial class VoltageSourceComponentParameters : UserControl
    {
        private string oldElementName;

        public VoltageSource SerializableVoltageSource { get; }
        
        private int selectedVoltageFunctionType { get => SerializableVoltageSource.OutputVoltageFunctionType; }
        private int selectedImpedanceFunctionType { get => SerializableVoltageSource.OutputImpedanceFunctionType; }
        
        public VoltageSourceComponentParameters()
        {
            this.InitializeComponent();
        }

        public VoltageSourceComponentParameters(VoltageSource vs)
        {
            this.InitializeComponent();
            SerializableVoltageSource = vs;


            vs.PropertyChanged += handleChangeOfControls;
            handleChangeOfControls(null, null);

        }

        private void voltageFunctionTypeChanged(object sender, SelectionChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableVoltageSource,
                OldValue = SerializableVoltageSource.OutputVoltageFunctionType,
                NewValue = cmbOutputVoltage.SelectedIndex,
                Property = "OutputVoltageFunctionType"
            };

            executeCommand(command);
            
        }

        private void impedanceFunctionTypeChanged(object sender, SelectionChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableVoltageSource,
                OldValue = SerializableVoltageSource.OutputImpedanceFunctionType,
                NewValue = cmbOutputImpedance.SelectedIndex,
                Property = "OutputImpedanceFunctionType"
            };

            executeCommand(command);

        }



        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableVoltageSource.PropertyChanged -= handleChangeOfControls;
            
            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableVoltageSource.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            cmbOutputVoltage.SelectionChanged -= voltageFunctionTypeChanged;
            cmbOutputVoltage.SelectedIndex = SerializableVoltageSource.OutputVoltageFunctionType;
            cmbOutputVoltage.SelectionChanged += voltageFunctionTypeChanged;

            pnlVoltageConstant.Visibility = Visibility.Collapsed;
            pnlVoltageLibraryCurve.Visibility = Visibility.Collapsed;

            if (selectedVoltageFunctionType == 0)
                pnlVoltageConstant.Visibility = Visibility.Visible;
            else
                pnlVoltageLibraryCurve.Visibility = Visibility.Visible;


            cmbOutputImpedance.SelectionChanged -= impedanceFunctionTypeChanged;
            cmbOutputImpedance.SelectedIndex = SerializableVoltageSource.OutputImpedanceFunctionType;
            cmbOutputImpedance.SelectionChanged += impedanceFunctionTypeChanged;

            pnlImpedanceConstant.Visibility = Visibility.Collapsed;
            pnlImpedanceLibraryCurve.Visibility = Visibility.Collapsed;

            if (selectedImpedanceFunctionType == 0)
                pnlImpedanceConstant.Visibility = Visibility.Visible;
            else
                pnlImpedanceLibraryCurve.Visibility = Visibility.Visible;

            boxConstVoltage.Value = SerializableVoltageSource.ConstantOutputVoltage;
            boxConstImpedance.Value = SerializableVoltageSource.ConstantOutputImpedance;

            SerializableVoltageSource.PropertyChanged += handleChangeOfControls;
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableVoltageSource.ElementName;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableVoltageSource,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }
        
        private void ConstantVoltageChanged(object sender, Common.ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableVoltageSource,
                OldValue = SerializableVoltageSource.ConstantOutputVoltage,
                NewValue = args.newValue,
                Property = "ConstantOutputVoltage"
            };

            executeCommand(command);
        }

        private void ConstantImpedanceChanged(object sender, Common.ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableVoltageSource,
                OldValue = SerializableVoltageSource.ConstantOutputImpedance,
                NewValue = args.newValue,
                Property = "ConstantOutputImpedance"
            };

            executeCommand(command);
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }
    }
}
